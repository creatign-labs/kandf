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

    const { student_id, course_id, batch_id, payment_schedule } = await req.json();
    console.log("Request params:", { student_id, course_id, batch_id, payment_schedule });

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

    // Get current enrollment status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("enrollment_status")
      .eq("id", student_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.enrollment_status !== "enrolled") {
      return new Response(JSON.stringify({ error: "Only students with enrolled status can be activated" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile status to active and explicitly set must_change_password to false
    // The generated password is FINAL - no mandatory password change required
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        enrollment_status: "active", 
        must_change_password: false,
        updated_at: new Date().toISOString() 
      })
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
        .select("id, student_code")
        .eq("student_id", student_id)
        .eq("course_id", enrollmentCourseId)
        .maybeSingle();

      let studentCode = existingEnrollment?.student_code || null;

      if (!existingEnrollment) {
        // Generate student ID
        const { data: generatedCode } = await supabaseAdmin.rpc("generate_student_id", {
          p_course_id: enrollmentCourseId,
        });
        studentCode = generatedCode;

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

          // Create payment schedule for the student
          // Get the course fee first
          const { data: courseData } = await supabaseAdmin
            .from("courses")
            .select("base_fee")
            .eq("id", enrollmentCourseId)
            .single();

          // Create custom payment schedule if provided, otherwise use defaults
          if (payment_schedule && payment_schedule.balance1Amount && payment_schedule.balance2Amount) {
            console.log("Using custom payment schedule:", payment_schedule);
            
            // Insert registration fee (already paid)
            const { error: regError } = await supabaseAdmin.from("payment_schedules").insert({
              enrollment_id: newEnrollment.id,
              student_id: student_id,
              payment_stage: "registration",
              amount: 2000,
              due_date: new Date().toISOString().split('T')[0],
              status: "paid",
              paid_at: new Date().toISOString(),
            });
            if (regError) console.error("Failed to insert registration payment:", regError);

            // Insert Balance 1
            const { error: bal1Error } = await supabaseAdmin.from("payment_schedules").insert({
              enrollment_id: newEnrollment.id,
              student_id: student_id,
              payment_stage: "balance_1",
              amount: payment_schedule.balance1Amount,
              due_date: payment_schedule.balance1DueDate,
              status: "pending",
            });
            if (bal1Error) console.error("Failed to insert balance 1 payment:", bal1Error);

            // Insert Balance 2
            const { error: bal2Error } = await supabaseAdmin.from("payment_schedules").insert({
              enrollment_id: newEnrollment.id,
              student_id: student_id,
              payment_stage: "balance_2",
              amount: payment_schedule.balance2Amount,
              due_date: payment_schedule.balance2DueDate,
              status: "pending",
            });
            if (bal2Error) console.error("Failed to insert balance 2 payment:", bal2Error);

            console.log(`Custom payment schedule created for enrollment ${newEnrollment.id}`);
          } else if (courseData?.base_fee) {
            // Use default payment schedule via RPC
            const { error: scheduleError } = await supabaseAdmin.rpc("create_payment_schedule", {
              p_enrollment_id: newEnrollment.id,
              p_student_id: student_id,
              p_total_amount: courseData.base_fee,
              p_registration_amount: 2000, // The advance payment already made
              p_due_days_1: 7,  // Balance 1 due in 7 days
              p_due_days_2: 30, // Balance 2 due in 30 days
            });

            if (scheduleError) {
              console.error("Failed to create payment schedule:", scheduleError);
            } else {
              console.log(`Default payment schedule created for enrollment ${newEnrollment.id}`);
            }
          }
        }
      } else {
        console.log("Enrollment already exists, skipping creation");
        studentCode = existingEnrollment.student_code;
      }

      // Store studentCode for response
      var finalStudentCode = studentCode;
    } else {
      console.log("No course specified and no advance payment found, skipping enrollment creation");
      var finalStudentCode = null;
    }

    // Create notification for the student
    await supabaseAdmin.from("notifications").insert({
      user_id: student_id,
      title: "Access Approved!",
      message: "Your account has been approved. You can now access your dashboard and your enrolled course.",
      type: "success",
    });

    // Get student email and course name for email
    const { data: studentProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", student_id)
      .single();

    let courseName = null;
    if (enrollmentCourseId) {
      const { data: courseInfo } = await supabaseAdmin
        .from("courses")
        .select("title")
        .eq("id", enrollmentCourseId)
        .single();
      courseName = courseInfo?.title;
    }

    // Try to send credentials email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    if (RESEND_API_KEY && studentProfile?.email) {
      try {
        const loginUrl = req.headers.get("origin") || "https://kandf.lovable.app";
        const studentName = `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim();
        
        const emailHtml = `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
            <div style="background:#d4a574;padding:32px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:24px;">🧁 Knead & Frost</h1>
              <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">Global Baking Academy</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1a1a1a;margin-top:0;">Welcome, ${studentName}!</h2>
              <p>Your account has been approved. Here are your login credentials:</p>
              <div style="background:#faf5f0;border:1px solid #e8d5c4;border-radius:8px;padding:20px;margin:20px 0;">
                ${finalStudentCode ? `<p><strong>Student ID:</strong> ${finalStudentCode}</p>` : ''}
                ${courseName ? `<p><strong>Course:</strong> ${courseName}</p>` : ''}
                <p><strong>Email:</strong> ${studentProfile.email}</p>
                <p><strong>Password:</strong> ${newPassword}</p>
              </div>
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px;margin:16px 0;font-size:13px;color:#92400e;">
                ⚠️ Please keep your credentials safe.
              </div>
              <div style="text-align:center;">
                <a href="${loginUrl}/login" style="display:inline-block;background:#d4a574;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Login to Your Dashboard</a>
              </div>
            </div>
          </div>
        `;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Knead & Frost <onboarding@resend.dev>",
            to: [studentProfile.email],
            subject: "Your Knead & Frost Student Credentials",
            html: emailHtml,
          }),
        });

        const resendData = await resendRes.json();
        emailSent = resendRes.ok;
        console.log("Email send result:", resendRes.ok, resendData);
      } catch (emailErr) {
        console.error("Failed to send credentials email:", emailErr);
      }
    }

    console.log(`Student ${student_id} approved with new password and student ID: ${finalStudentCode}`);

    return new Response(JSON.stringify({ 
      success: true, 
      password: newPassword,
      studentCode: finalStudentCode,
      emailSent,
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
