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

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuperAdmin } = await supabaseUser.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only super admins can approve students" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { student_id, course_id, payment_schedule } = await req.json();
    if (!student_id) {
      return new Response(JSON.stringify({ error: "student_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // STEP 1: VALIDATE
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("enrollment_status")
      .eq("id", student_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "Student not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.enrollment_status !== "enrolled") {
      return new Response(JSON.stringify({
        success: false,
        error: `Only students with 'enrolled' status can be activated (current: ${profile.enrollment_status}).`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Lock to the course the student paid for (immutable)
    const { data: advancePayment } = await supabaseAdmin
      .from("advance_payments")
      .select("course_id")
      .eq("student_id", student_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: existingActive } = await supabaseAdmin
      .from("enrollments")
      .select("id, course_id, batch_id, student_code")
      .eq("student_id", student_id)
      .eq("status", "active")
      .maybeSingle();

    const lockedCourseId: string | undefined =
      existingActive?.course_id || advancePayment?.course_id || course_id;

    if (!lockedCourseId) {
      return new Response(JSON.stringify({
        success: false,
        error: "No course found for this student. They must complete the advance payment for a course before approval.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (course_id && course_id !== lockedCourseId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Course mismatch: this student's course is locked to the one they paid for and cannot be changed at approval.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STEP 2: MUTATIONS
    const generatePassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    const newPassword = generatePassword();

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(student_id, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateAuthError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to update password: " + updateAuthError.message,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create enrollment locked to course only — NO batch assignment.
    // Students will pick slots from any batch tied to this course later.
    let finalStudentCode: string | null = existingActive?.student_code || null;
    let enrollmentId: string | null = existingActive?.id || null;

    if (!existingActive) {
      const { data: generatedCode } = await supabaseAdmin.rpc("generate_student_id", {
        p_course_id: lockedCourseId,
      });
      finalStudentCode = generatedCode;

      const { data: newEnrollment, error: enrollmentError } = await supabaseAdmin
        .from("enrollments")
        .insert({
          student_id,
          course_id: lockedCourseId,
          batch_id: null,
          status: "active",
          progress: 0,
          student_code: finalStudentCode || null,
          enrollment_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (enrollmentError) {
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to create enrollment: " + enrollmentError.message,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      enrollmentId = newEnrollment.id;

      const { data: courseData } = await supabaseAdmin
        .from("courses")
        .select("base_fee")
        .eq("id", lockedCourseId)
        .single();

      if (payment_schedule && payment_schedule.balance1Amount && payment_schedule.balance2Amount) {
        await supabaseAdmin.from("payment_schedules").insert([
          {
            enrollment_id: enrollmentId,
            student_id,
            payment_stage: "registration",
            amount: 2000,
            due_date: new Date().toISOString().split("T")[0],
            status: "paid",
            paid_at: new Date().toISOString(),
          },
          {
            enrollment_id: enrollmentId,
            student_id,
            payment_stage: "balance_1",
            amount: payment_schedule.balance1Amount,
            due_date: payment_schedule.balance1DueDate,
            status: "pending",
          },
          {
            enrollment_id: enrollmentId,
            student_id,
            payment_stage: "balance_2",
            amount: payment_schedule.balance2Amount,
            due_date: payment_schedule.balance2DueDate,
            status: "pending",
          },
        ]);
      } else if (courseData?.base_fee) {
        await supabaseAdmin.rpc("create_payment_schedule", {
          p_enrollment_id: enrollmentId,
          p_student_id: student_id,
          p_total_amount: courseData.base_fee,
          p_registration_amount: 2000,
          p_due_days_1: 7,
          p_due_days_2: 30,
        });
      }
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        enrollment_status: "active",
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student_id);

    if (updateProfileError) {
      return new Response(JSON.stringify({
        success: false,
        error: "Enrollment created but profile activation failed: " + updateProfileError.message,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin
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

    await supabaseAdmin.from("notifications").insert({
      user_id: student_id,
      title: "Access Approved!",
      message: "Your account has been approved. You can now access your dashboard and book slots from any available batch.",
      type: "success",
    });

    return new Response(JSON.stringify({
      success: true,
      password: newPassword,
      studentCode: finalStudentCode,
      message: "Student approved and password updated",
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
