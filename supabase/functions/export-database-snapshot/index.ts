import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "courses", "modules", "recipes", "recipe_ingredients", "assessments", "questions",
  "inventory", "batches", "jobs", "job_applications", "leads", "lead_payment_plans", "lead_installments",
  "profiles", "user_roles", "staff_permissions", "vendor_profiles",
  "enrollments", "payment_schedules", "payments", "advance_payments", "addon_purchases",
  "bookings", "attendance", "recipe_batches", "recipe_batch_memberships", "recipe_batch_audit_log",
  "student_recipe_progress", "student_access_approvals",
  "feedback", "certificates", "resumes", "resume_access_logs",
  "inventory_ledger", "inventory_usage", "inventory_checklists", "inventory_checklist_items",
  "purchase_orders", "purchase_order_items", "daily_inventory_requirements", "daily_inventory_requirement_items",
  "financial_ledger", "audit_logs", "approval_requests", "enrollment_status_logs",
  "notifications", "notification_logs", "chef_specializations",
];

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Only super admins can export" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build a JSON snapshot containing CSV strings for each table
    const snapshot: Record<string, { csv: string; rowCount: number; error?: string }> = {};
    for (const table of TABLES) {
      try {
        // page in 1000-row chunks
        const all: Record<string, unknown>[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabaseAdmin.from(table).select("*").range(from, from + pageSize - 1);
          if (error) {
            snapshot[table] = { csv: "", rowCount: 0, error: error.message };
            break;
          }
          if (!data || data.length === 0) {
            if (from === 0) snapshot[table] = { csv: "", rowCount: 0 };
            break;
          }
          all.push(...data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        if (!snapshot[table]) {
          snapshot[table] = { csv: toCSV(all), rowCount: all.length };
        }
      } catch (e) {
        snapshot[table] = { csv: "", rowCount: 0, error: e instanceof Error ? e.message : "unknown" };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      tables: snapshot,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("export-database-snapshot error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
