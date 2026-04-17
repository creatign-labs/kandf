import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables in safe deletion order (children first)
const DELETION_ORDER = [
  "student_answers",
  "student_assessments",
  "notification_logs",
  "notifications",
  "inventory_checklist_items",
  "inventory_checklists",
  "daily_inventory_requirement_items",
  "daily_inventory_requirements",
  "inventory_approvals",
  "purchase_order_items",
  "purchase_orders",
  "inventory_usage",
  "inventory_ledger",
  "financial_ledger",
  "recipe_batch_audit_log",
  "recipe_batch_memberships",
  "recipe_batches",
  "student_recipe_progress",
  "student_online_recipes",
  "student_online_access",
  "attendance",
  "bookings",
  "payment_schedules",
  "payments",
  "addon_purchases",
  "advance_payments",
  "certificates",
  "feedback",
  "enrollment_status_logs",
  "enrollments",
  "student_access_approvals",
  "resume_access_logs",
  "resumes",
  "job_applications",
  "jobs",
  "lead_installments",
  "lead_payment_plans",
  "leads",
  "approval_requests",
  "audit_logs",
  "questions",
  "assessments",
  "recipe_ingredients",
  "chef_specializations",
  "recipes",
  "modules",
  "inventory",
  "batches",
  "courses",
  "vendor_profiles",
];

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperAdmin = roles?.some((r: { role: string }) => r.role === "super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only super admins can clear data" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    // Step 1: identify @demo.com users to PRESERVE
    const demoUserIds = new Set<string>();
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const u of data.users) {
        if (u.email && u.email.toLowerCase().endsWith("@demo.com")) {
          demoUserIds.add(u.id);
        }
      }
      if (data.users.length < 1000) break;
      page++;
    }

    // Step 2: get all non-demo auth user IDs to DELETE
    const usersToDelete: { id: string; email: string | undefined }[] = [];
    page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const u of data.users) {
        if (!demoUserIds.has(u.id)) {
          usersToDelete.push({ id: u.id, email: u.email });
        }
      }
      if (data.users.length < 1000) break;
      page++;
    }

    // Pre-flight counts
    const tableCounts: Record<string, number> = {};
    for (const table of DELETION_ORDER) {
      const { count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
      tableCounts[table] = count ?? 0;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        preservedDemoUsers: demoUserIds.size,
        usersToDelete: usersToDelete.length,
        tableCounts,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: delete reference data tables (these don't depend on auth users)
    const results: Record<string, number> = {};
    for (const table of DELETION_ORDER) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
          .select("id");
        if (error) {
          console.error(`Error clearing ${table}:`, error.message);
          results[table] = -1;
        } else {
          results[table] = data?.length ?? 0;
        }
      } catch (e) {
        console.error(`Exception clearing ${table}:`, e);
        results[table] = -1;
      }
    }

    // Step 4: delete non-demo auth users (cascades profiles, user_roles, staff_permissions)
    let deletedUsers = 0;
    let failedUsers = 0;
    for (const u of usersToDelete) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (error) {
        console.error(`Failed to delete user ${u.email}:`, error.message);
        failedUsers++;
      } else {
        deletedUsers++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      preservedDemoUsers: demoUserIds.size,
      deletedUsers,
      failedUsers,
      tableCounts: results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("clear-sample-data error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
