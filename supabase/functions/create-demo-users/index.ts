import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-setup",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function uses service role key internally for demo setup
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const demoUsers = [
      { email: "student@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Student", roles: ["student"] },
      { email: "student2@demo.com", password: "Demo123!", firstName: "Priya", lastName: "Sharma", roles: ["student"] },
      { email: "student3@demo.com", password: "Demo123!", firstName: "Rahul", lastName: "Mehta", roles: ["student"] },
      { email: "student4@demo.com", password: "Demo123!", firstName: "Ananya", lastName: "Patel", roles: ["student"] },
      { email: "student5@demo.com", password: "Demo123!", firstName: "Vikram", lastName: "Singh", roles: ["student"] },
      { email: "student6@demo.com", password: "Demo123!", firstName: "Neha", lastName: "Gupta", roles: ["student"] },
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
        // Ensure profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', existingUser.id)
          .single();

        if (!existingProfile) {
          await supabaseAdmin.from('profiles').insert({
            id: existingUser.id,
            first_name: user.firstName,
            last_name: user.lastName,
            account_status: 'active'
          });
        } else {
          // Update account status to active
          await supabaseAdmin.from('profiles')
            .update({ account_status: 'active' })
            .eq('id', existingUser.id);
        }

        // Ensure roles exist
        for (const role of user.roles) {
          const { data: existingRole } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('role', role)
            .single();

          if (!existingRole) {
            await supabaseAdmin.from('user_roles').insert({
              user_id: existingUser.id,
              role: role
            });
          }
        }

        results.push({ email: user.email, status: "exists - ensured profile & roles", roles: user.roles, userId: existingUser.id });
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

      // Create profile
      if (authData.user) {
        await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          account_status: 'active'
        });

        // Assign roles
        for (const role of user.roles) {
          await supabaseAdmin.from('user_roles').insert({
            user_id: authData.user.id,
            role: role
          });
        }
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
