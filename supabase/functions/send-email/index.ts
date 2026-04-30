import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const DEFAULT_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Knead & Frost <noreply@kneadandfrost.in>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Email gateway/connection not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      return new Response(JSON.stringify({ error: "Server auth configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("Unauthorized send-email request", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);

    if (rolesError) {
      console.error("Failed to verify sender role", rolesError);
      return new Response(JSON.stringify({ error: "Unable to verify sender permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Only admins can send emails" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html, from } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, and html are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    const resendResponse = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    const resendText = await resendResponse.text();
    let resendData: Record<string, unknown> = {};
    try { resendData = resendText ? JSON.parse(resendText) : {}; } catch { resendData = { raw: resendText }; }

    if (!resendResponse.ok) {
      console.error("Resend gateway error:", resendResponse.status, resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully:", resendData);

    return new Response(JSON.stringify({ success: true, id: (resendData as any).id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-email:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
