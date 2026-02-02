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
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin/super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin or super_admin by checking user_roles table
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can create students" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { firstName, lastName, email, phone, courseId, dateOfJoining } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !courseId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: firstName, lastName, email, courseId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary password (will be replaced on approval)
    const tempPassword = crypto.randomUUID();

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: "student",
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile with enrollment_status = 'enrolled'
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        enrollment_status: "enrolled",
        phone: phone || null,
        email: email,
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't fail completely, the user was created
    }

    // Create advance_payment record to track the enrollment
    const { error: paymentError } = await supabaseAdmin
      .from("advance_payments")
      .insert({
        student_id: newUser.user.id,
        course_id: courseId,
        amount: 2000,
        status: "pending",
        payment_method: "admin_created",
      });

    if (paymentError) {
      console.error("Error creating advance payment:", paymentError);
    }

    // Log the enrollment status change
    await supabaseAdmin
      .from("enrollment_status_logs")
      .insert({
        student_id: newUser.user.id,
        old_enrollment_status: "pending",
        new_enrollment_status: "enrolled",
        changed_by: requestingUser.id,
        reason: `Admin-created enrollment for course. Date of joining: ${dateOfJoining || 'Not specified'}`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        studentId: newUser.user.id,
        email: email,
        message: "Student created successfully. Awaiting payment and approval.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
