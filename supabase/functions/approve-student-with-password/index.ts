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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    console.log("Received approval request");

    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify they're a super_admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated:", user.id);

    // Check if caller is super_admin
    const { data: isSuperAdmin } = await supabaseUser.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      console.error("User is not super admin:", user.id);
      return new Response(JSON.stringify({ error: "Only super admins can approve students" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Super admin verified");

    const { student_id, course_id, batch_id } = await req.json();
    console.log("Request params:", { student_id, course_id, batch_id });

    if (!student_id) {
      console.error("No student_id provided");
      return new Response(JSON.stringify({ error: "student_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // course_id can be passed to override the advance payment course
    // batch_id is optional for batch assignment

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a secure password
    const generatePassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();

    // Update the student's password in auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(student_id, {
      password: newPassword,
    });

    if (updateAuthError) {
      console.error("Failed to update auth password:", updateAuthError);
      return new Response(JSON.stringify({ error: "Failed to update password: " + updateAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current account status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("account_status")
      .eq("id", student_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.account_status !== "advance_paid") {
      return new Response(JSON.stringify({ error: "Only students with advance_paid status can be approved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile status to active
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: "active", updated_at: new Date().toISOString() })
      .eq("id", student_id);

    if (updateProfileError) {
      console.error("Failed to update profile:", updateProfileError);
      return new Response(JSON.stringify({ error: "Failed to update profile: " + updateProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update student_access_approvals
    const { error: approvalError } = await supabaseAdmin
      .from("student_access_approvals")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        generated_password: newPassword,
        credentials_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", student_id);

    if (approvalError) {
      console.error("Failed to update approval record:", approvalError);
    }

    // Determine the course to enroll in: use provided course_id or fall back to advance payment course
    let enrollmentCourseId = course_id;
    
    if (!enrollmentCourseId) {
      // Get advance payment to find the course the student paid for
      const { data: advancePayment } = await supabaseAdmin
        .from("advance_payments")
        .select("course_id")
        .eq("student_id", student_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      enrollmentCourseId = advancePayment?.course_id;
    }

    if (enrollmentCourseId) {
      console.log(`Creating enrollment for student ${student_id} in course ${enrollmentCourseId}`);
      
      // batch_id is required - if not provided, get the first available batch for this course
      let enrollmentBatchId = batch_id;
      
      if (!enrollmentBatchId) {
        // Find an available batch for this course
        const { data: availableBatch } = await supabaseAdmin
          .from("batches")
          .select("id")
          .eq("course_id", enrollmentCourseId)
          .gt("available_seats", 0)
          .order("start_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (availableBatch) {
          enrollmentBatchId = availableBatch.id;
          console.log(`Auto-selected batch ${enrollmentBatchId} for enrollment`);
        } else {
          console.error("No available batch found for course, cannot create enrollment");
          return new Response(JSON.stringify({ 
            error: "No available batch found for this course. Please create a batch first or select one with available seats." 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("student_id", student_id)
        .eq("course_id", enrollmentCourseId)
        .maybeSingle();

      if (!existingEnrollment) {
        // Generate student ID
        const { data: studentCode } = await supabaseAdmin.rpc("generate_student_id", {
          p_course_id: enrollmentCourseId,
        });

        // Create enrollment for the course
        const { data: newEnrollment, error: enrollmentError } = await supabaseAdmin
          .from("enrollments")
          .insert({
            student_id: student_id,
            course_id: enrollmentCourseId,
            batch_id: enrollmentBatchId,
            status: "active",
            progress: 0,
            student_code: studentCode || null,
            enrollment_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (enrollmentError) {
          console.error("Failed to create enrollment:", enrollmentError);
          return new Response(JSON.stringify({ 
            error: "Failed to create enrollment: " + enrollmentError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          console.log(`Enrollment created successfully for course ${enrollmentCourseId} in batch ${enrollmentBatchId}`);
          
          // Decrement available seats for the batch
          const { error: batchError } = await supabaseAdmin.rpc("decrement_batch_seats", {
            batch_id: enrollmentBatchId,
          });
          if (batchError) {
            console.error("Failed to decrement batch seats:", batchError);
          } else {
            console.log(`Decremented seats for batch ${enrollmentBatchId}`);
          }
        }
      } else {
        console.log("Enrollment already exists, skipping creation");
      }
    } else {
      console.log("No course specified and no advance payment found, skipping enrollment creation");
    }

    // Create notification for the student
    await supabaseAdmin.from("notifications").insert({
      user_id: student_id,
      title: "Access Approved!",
      message: "Your account has been approved. You can now access your dashboard and your enrolled course.",
      type: "success",
    });

    console.log(`Student ${student_id} approved with new password`);

    return new Response(JSON.stringify({ 
      success: true, 
      password: newPassword,
      message: "Student approved and password updated"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in approve-student-with-password:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
