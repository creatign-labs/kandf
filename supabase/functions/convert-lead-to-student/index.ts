import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user is an admin/super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", requestingUser.id);
    const roles = userRoles?.map(r => r.role) || [];
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      return new Response(JSON.stringify({ error: "Only admins can convert leads" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "Missing leadId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads").select("*").eq("id", leadId).single();
    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update lead stage
    await supabaseAdmin.from("leads").update({ stage: "converted" }).eq("id", leadId);

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === lead.email);

    let studentId: string;

    if (existingUser) {
      console.log("User already exists with email:", lead.email);
      studentId = existingUser.id;
    } else {
      // Generate password
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const nameParts = (lead.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: lead.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone: lead.phone || "",
        },
      });

      if (createError) {
        console.error("Failed to create student auth user:", createError);
        return new Response(JSON.stringify({
          error: "Student creation failed: " + createError.message,
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      studentId = newUser.user.id;
      console.log("Created student auth user:", studentId);
    }

    // Upsert profile to enrolled (handles case where profile was deleted or doesn't exist)
    const nameParts = (lead.name || "").trim().split(/\s+/);
    const profileData = {
      id: studentId,
      enrollment_status: "enrolled",
      first_name: nameParts[0] || "Student",
      last_name: nameParts.slice(1).join(" ") || "",
      phone: lead.phone || null,
      email: lead.email,
      updated_at: new Date().toISOString(),
    };
    
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(profileData, { onConflict: "id" });
    if (profileError) {
      console.error("Failed to upsert profile:", profileError);
    } else {
      console.log("Profile upserted for student:", studentId);
    }

    // Create student_access_approvals record
    await supabaseAdmin.from("student_access_approvals").insert({
      student_id: studentId,
      advance_payment_id: null,
      status: "pending",
    });

    // Notify admins
    const { data: adminUsers } = await supabaseAdmin
      .from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);

    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        title: "Lead Converted – Student Created",
        message: `${lead.name} enrollment fee marked as paid. Student account created and awaiting activation.`,
        type: "info",
      }));
      await supabaseAdmin.from("notifications").insert(notifications);
    }

    // Determine course_id from lead or lead_payment_plans
    let courseId = lead.course_id;
    if (!courseId) {
      const { data: plan } = await supabaseAdmin
        .from("lead_payment_plans")
        .select("course_id")
        .eq("lead_id", leadId)
        .maybeSingle();
      courseId = plan?.course_id || null;
    }

    // Create advance_payments record so approve-student-with-password can find the course
    if (courseId) {
      const { error: apError } = await supabaseAdmin.from("advance_payments").insert({
        student_id: studentId,
        course_id: courseId,
        amount: 2000,
        status: "completed",
        payment_method: "lead_conversion",
        paid_at: new Date().toISOString(),
      });
      if (apError) {
        console.error("Failed to create advance_payment record:", apError);
      } else {
        console.log("Created advance_payment record for course:", courseId);
      }
    }

    // Log enrollment status change
    await supabaseAdmin.from("enrollment_status_logs").insert({
      student_id: studentId,
      old_enrollment_status: "pending",
      new_enrollment_status: "enrolled",
      changed_by: requestingUser.id,
      reason: "Lead converted via manual payment confirmation",
    });

    return new Response(JSON.stringify({
      success: true,
      student_id: studentId,
      message: "Lead converted and student account created.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in convert-lead-to-student:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
