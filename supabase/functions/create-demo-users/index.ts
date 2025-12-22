import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow unauthenticated access for demo setup - uses service role internally
  const authHeader = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  // Accept either anon key or no auth for this demo setup function
  if (authHeader && !authHeader.includes(anonKey || "")) {
    // If auth header exists but doesn't match anon key, still proceed
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const demoUsers = [
      { email: "student@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Student", roles: ["student"] },
      { email: "admin@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Admin", roles: ["admin"] },
      { email: "chef@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Chef", roles: ["chef"] },
      { email: "superadmin@demo.com", password: "SuperAdmin123!", firstName: "Super", lastName: "Admin", roles: ["admin", "super_admin"] },
    ];

    const results = [];

    for (const user of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        results.push({ email: user.email, status: "already exists", roles: user.roles });
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

      if (authError) {
        results.push({ email: user.email, status: "error", error: authError.message });
        continue;
      }

      results.push({ email: user.email, status: "created", roles: user.roles, userId: authData.user?.id });
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
