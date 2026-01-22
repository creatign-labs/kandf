import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-setup",
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

    // Delete all existing demo users first
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const deletedEmails: string[] = [];
    
    for (const user of existingUsers?.users || []) {
      if (user.email?.endsWith('@demo.com')) {
        deletedEmails.push(user.email);
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    // Demo users for Flow 1 testing
    const demoUsers = [
      {
        email: "student@demo.com",
        password: "Demo123!",
        firstName: "Demo",
        lastName: "Student",
        roles: ['student'] as const,
        accountStatus: 'pending'
      },
      {
        email: "admin@demo.com",
        password: "Admin@123",
        firstName: "Demo",
        lastName: "Admin",
        roles: ['admin'] as const,
        accountStatus: 'active'
      },
      {
        email: "superadmin@demo.com",
        password: "SuperAdmin123!",
        firstName: "Super",
        lastName: "Admin",
        roles: ['admin', 'super_admin'] as const,
        accountStatus: 'active'
      }
    ];

    const createdUsers: Array<{ email: string; password: string; userId?: string; roles: readonly string[]; accountStatus: string }> = [];

    for (const user of demoUsers) {
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
        console.error(`Failed to create ${user.email}:`, authError.message);
        continue;
      }

      if (authData.user) {
        // Create profile
        await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          account_status: user.accountStatus
        });

        // Assign roles
        for (const role of user.roles) {
          await supabaseAdmin.from('user_roles').insert({
            user_id: authData.user.id,
            role: role
          });
        }

        createdUsers.push({
          email: user.email,
          password: user.password,
          userId: authData.user.id,
          roles: user.roles,
          accountStatus: user.accountStatus
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deletedEmails,
      createdUsers,
      message: "Demo accounts created - ready to test Flow 1"
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
