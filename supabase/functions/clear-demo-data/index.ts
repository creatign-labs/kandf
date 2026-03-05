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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is super_admin
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

    // Delete in dependency order (children first, parents last)
    const deletionOrder = [
      // Level 1: Deepest dependencies
      "student_answers",
      "student_assessments",
      "notification_logs",
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
      // Level 2: Mid-level
      "questions",
      "assessments",
      "recipe_ingredients",
      "chef_specializations",
      "recipes",
      "modules",
      // Level 3: Jobs
      "job_applications",
      "jobs",
      // Level 4: Inventory & Batches
      "inventory",
      "batches",
      // Level 5: Root
      "courses",
    ];

    const results: Record<string, number> = {};

    for (const table of deletionOrder) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000") // delete all rows
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

    return new Response(JSON.stringify({
      success: true,
      message: "All demo/seed data cleared",
      deletedCounts: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
