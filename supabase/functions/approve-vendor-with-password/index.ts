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

    console.log("Received vendor approval request");

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
      return new Response(JSON.stringify({ error: "Only super admins can approve vendors" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Super admin verified");

    const { vendor_user_id, vendor_profile_id } = await req.json();
    console.log("Request params:", { vendor_user_id, vendor_profile_id });

    if (!vendor_user_id) {
      console.error("No vendor_user_id provided");
      return new Response(JSON.stringify({ error: "vendor_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Update the vendor's password in auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(vendor_user_id, {
      password: newPassword,
    });

    if (updateAuthError) {
      console.error("Failed to update auth password:", updateAuthError);
      return new Response(JSON.stringify({ error: "Failed to update password: " + updateAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate vendor ID
    const { data: vendorCode } = await supabaseAdmin.rpc("generate_vendor_id");

    // Update vendor profile
    const { error: profileError } = await supabaseAdmin
      .from("vendor_profiles")
      .update({
        approval_status: "approved",
        is_active: true,
        vendor_code: vendorCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendor_profile_id);

    if (profileError) {
      console.error("Failed to update vendor profile:", profileError);
      return new Response(JSON.stringify({ error: "Failed to update vendor profile: " + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update vendor_access_approvals
    const { error: approvalError } = await supabaseAdmin
      .from("vendor_access_approvals")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        generated_password: newPassword,
        credentials_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", vendor_user_id);

    if (approvalError) {
      console.error("Failed to update approval record:", approvalError);
    }

    // Create notification for the vendor
    await supabaseAdmin.from("notifications").insert({
      user_id: vendor_user_id,
      title: "Account Approved!",
      message: "Your vendor account has been approved. You can now log in and start posting jobs.",
      type: "success",
    });

    // Get vendor details for email
    const { data: vendorProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", vendor_user_id)
      .single();

    const { data: vendorDetails } = await supabaseAdmin
      .from("vendor_profiles")
      .select("company_name, contact_email")
      .eq("id", vendor_profile_id)
      .single();

    // Try to send credentials email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    const vendorEmail = vendorDetails?.contact_email || vendorProfile?.email;
    
    if (RESEND_API_KEY && vendorEmail) {
      try {
        const loginUrl = req.headers.get("origin") || "https://kandf.lovable.app";
        const vendorName = `${vendorProfile?.first_name || ""} ${vendorProfile?.last_name || ""}`.trim();
        
        const emailHtml = `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
            <div style="background:#d4a574;padding:32px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:24px;">🧁 Knead & Frost</h1>
              <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">Vendor Portal</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1a1a1a;margin-top:0;">Welcome, ${vendorName}!</h2>
              <p>Your vendor account for <strong>${vendorDetails?.company_name || "N/A"}</strong> has been approved.</p>
              <div style="background:#faf5f0;border:1px solid #e8d5c4;border-radius:8px;padding:20px;margin:20px 0;">
                <p><strong>Vendor ID:</strong> ${vendorCode}</p>
                <p><strong>Email:</strong> ${vendorEmail}</p>
                <p><strong>Password:</strong> ${newPassword}</p>
              </div>
              <div style="text-align:center;">
                <a href="${loginUrl}/login" style="display:inline-block;background:#d4a574;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Login to Vendor Portal</a>
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
            to: [vendorEmail],
            subject: "Your Knead & Frost Vendor Credentials",
            html: emailHtml,
          }),
        });

        const resendData = await resendRes.json();
        emailSent = resendRes.ok;
        console.log("Vendor email send result:", resendRes.ok, resendData);
      } catch (emailErr) {
        console.error("Failed to send vendor credentials email:", emailErr);
      }
    }

    console.log(`Vendor ${vendor_user_id} approved with new password and code ${vendorCode}`);

    return new Response(JSON.stringify({
      success: true,
      password: newPassword,
      vendor_code: vendorCode,
      emailSent,
      message: "Vendor approved and password updated"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in approve-vendor-with-password:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
