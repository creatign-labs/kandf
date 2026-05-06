import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderTemplate, FROM_ADDRESS, GATEWAY_URL, type TemplateName } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_TEMPLATES: TemplateName[] = ["enquiry_ack"]; // callable without auth

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { template, to, data = {}, triggered_by = null } = body as {
      template: TemplateName; to: string; data?: Record<string, any>; triggered_by?: string | null;
    };

    if (!template || !to) {
      return new Response(JSON.stringify({ error: "template and to are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check unless public template
    let actorId: string | null = triggered_by;
    if (!PUBLIC_TEMPLATES.includes(template)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const token = authHeader.replace(/^Bearer\s+/i, "");
      // Allow service-role internal calls
      if (token !== serviceRoleKey) {
        const { data: u } = await admin.auth.getUser(token);
        if (!u?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        }
        actorId = u.user.id;
      }
    }

    const { subject, html } = renderTemplate(template, data);

    // Insert pending log
    const { data: logRow } = await admin.from("email_logs").insert({
      template, recipient: to, subject, status: "pending",
      triggered_by: actorId, metadata: data,
    }).select("id").single();

    const logId = logRow?.id;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });

    const text = await resp.text();
    let parsed: any = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }

    if (!resp.ok) {
      const errorMessage = parsed?.message || parsed?.error || `HTTP ${resp.status}`;
      if (logId) {
        await admin.from("email_logs").update({
          status: "failed", error_message: String(errorMessage).slice(0, 1000),
        }).eq("id", logId);
      }
      console.error("Resend error:", resp.status, parsed);
      return new Response(JSON.stringify({ error: "Failed to send email", details: parsed }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (logId) {
      await admin.from("email_logs").update({
        status: "sent", sent_at: new Date().toISOString(), provider_message_id: parsed?.id || null,
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, id: parsed?.id, log_id: logId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-branded-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
