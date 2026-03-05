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
      return new Response(JSON.stringify({ error: "Only super admins can manage staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      return await handleCreate(supabaseAdmin, body);
    } else if (action === "delete") {
      return await handleDelete(supabaseAdmin, body, user.id);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-staff error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCreate(supabaseAdmin: ReturnType<typeof createClient>, body: Record<string, string>) {
  const { firstName, lastName, email, phone, role, password, staffNumber } = body;

  if (!firstName || !lastName || !email || !role || !password) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate password length
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if email already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some(
    (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (emailExists) {
    return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create auth user
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError || !authData.user) {
    return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = authData.user.id;

  // Update profile
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    enrollment_status: "active",
  }, { onConflict: "id" });

  // Assign role
  await supabaseAdmin.from("user_roles").upsert({
    user_id: userId,
    role,
  }, { onConflict: "user_id,role" });

  // Store staff number in profile bio field temporarily (or we could add a column)
  if (staffNumber) {
    await supabaseAdmin.from("profiles").update({ bio: `Staff #${staffNumber}` }).eq("id", userId);
  }

  return new Response(JSON.stringify({
    success: true,
    userId,
    email,
    password,
    message: "Staff member created successfully",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDelete(
  supabaseAdmin: ReturnType<typeof createClient>,
  body: Record<string, string>,
  currentUserId: string
) {
  const { userId } = body;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Prevent self-deletion
  if (userId === currentUserId) {
    // Check if there's another super_admin
    const { data: superAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const otherSuperAdmins = superAdmins?.filter(
      (r: { user_id: string }) => r.user_id !== currentUserId
    );

    if (!otherSuperAdmins || otherSuperAdmins.length === 0) {
      return new Response(JSON.stringify({
        error: "Cannot delete your own account. You are the only super admin. Assign another super admin first.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Delete user roles first
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

  // Delete staff permissions
  await supabaseAdmin.from("staff_permissions").delete().eq("user_id", userId);

  // Delete the auth user (this cascades to profile via FK)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Staff member deleted successfully",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
