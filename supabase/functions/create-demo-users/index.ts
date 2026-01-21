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

    // Create only ONE demo student for Flow 1 testing
    const demoStudent = {
      email: "student@demo.com",
      password: "Demo123!",
      firstName: "Demo",
      lastName: "Student"
    };

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: demoStudent.email,
      password: demoStudent.password,
      email_confirm: true,
      user_metadata: {
        first_name: demoStudent.firstName,
        last_name: demoStudent.lastName,
      },
    });

    if (authError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: authError.message,
        deletedEmails 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authData.user) {
      // Create profile
      await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        first_name: demoStudent.firstName,
        last_name: demoStudent.lastName,
        account_status: 'pending' // Start as pending for Flow 1 testing
      });

      // Assign student role
      await supabaseAdmin.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'student'
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deletedEmails,
      createdUser: {
        email: demoStudent.email,
        password: demoStudent.password,
        userId: authData.user?.id,
        accountStatus: 'pending'
      },
      message: "Demo student created with 'pending' status - ready to test Flow 1"
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
