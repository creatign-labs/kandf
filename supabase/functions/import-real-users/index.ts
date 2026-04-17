import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserRow {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string; // student | chef | admin | super_admin | inventory_manager | vendor
}

interface ImportResult {
  email: string;
  success: boolean;
  message: string;
  tempPassword?: string;
  emailed?: boolean;
}

const VALID_ROLES = new Set(["student", "chef", "admin", "super_admin", "inventory_manager", "vendor"]);

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const symbols = "!@#$%";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  pwd += Math.floor(Math.random() * 10);
  return pwd;
}

async function sendCredentialEmail(email: string, firstName: string, password: string, loginUrl: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API") || Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API key missing — cannot send credential email");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Knead & Frost <onboarding@resend.dev>",
        to: [email],
        subject: "Your Knead & Frost account credentials",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>Welcome ${firstName},</h2>
            <p>Your account has been created on the Knead & Frost platform.</p>
            <p><strong>Email:</strong> ${email}<br/>
            <strong>Temporary Password:</strong> <code style="background:#f4f4f4;padding:4px 8px;border-radius:4px;">${password}</code></p>
            <p>Please log in and change your password as soon as possible.</p>
            <p><a href="${loginUrl}" style="background:#000;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Login</a></p>
            <p style="color:#666;font-size:12px;margin-top:30px;">If you did not expect this email, please ignore it.</p>
          </div>`,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const isSuperAdmin = roles?.some((r: { role: string }) => r.role === "super_admin");
    if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Only super admins can import users" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const users: UserRow[] = body.users || [];
    const dryRun: boolean = body.dryRun === true;
    const sendEmails: boolean = body.sendEmails !== false;
    const loginUrl: string = body.loginUrl || "https://kandf.lovable.app/login";

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: "users array is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validation pass
    const validationErrors: { row: number; email: string; error: string }[] = [];
    users.forEach((u, i) => {
      if (!u.email || !/^\S+@\S+\.\S+$/.test(u.email)) validationErrors.push({ row: i + 1, email: u.email || "", error: "Invalid email" });
      if (!u.first_name) validationErrors.push({ row: i + 1, email: u.email || "", error: "first_name required" });
      if (!u.last_name) validationErrors.push({ row: i + 1, email: u.email || "", error: "last_name required" });
      if (!u.role || !VALID_ROLES.has(u.role)) validationErrors.push({ row: i + 1, email: u.email || "", error: `Invalid role '${u.role}'` });
    });

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true, dryRun: true, total: users.length, validationErrors,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({
        success: false, error: "Validation failed", validationErrors,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: ImportResult[] = [];
    for (const u of users) {
      const password = generatePassword();
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { first_name: u.first_name, last_name: u.last_name, phone: u.phone || "" },
      });

      if (createErr || !created.user) {
        results.push({ email: u.email, success: false, message: createErr?.message || "Create failed" });
        continue;
      }

      // Default trigger creates profile + 'student' role. Adjust role if needed.
      if (u.role !== "student") {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
        await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: u.role });
      }

      // Update profile phone if missing
      if (u.phone) {
        await supabaseAdmin.from("profiles").update({ phone: u.phone }).eq("id", created.user.id);
      }

      let emailed = false;
      if (sendEmails) {
        emailed = await sendCredentialEmail(u.email, u.first_name, password, loginUrl);
      }

      results.push({ email: u.email, success: true, message: "Created", tempPassword: password, emailed });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return new Response(JSON.stringify({
      success: true,
      total: users.length,
      created: successCount,
      failed: failCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("import-real-users error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
