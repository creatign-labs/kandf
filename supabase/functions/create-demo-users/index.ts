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
      // 4 specialized chefs
      { email: "chef.pastry@demo.com", password: "Demo123!", firstName: "Maria", lastName: "Fernandez", roles: ["chef"], specialty: "pastry" },
      { email: "chef.bread@demo.com", password: "Demo123!", firstName: "Pierre", lastName: "Dupont", roles: ["chef"], specialty: "bread" },
      { email: "chef.cake@demo.com", password: "Demo123!", firstName: "Sophie", lastName: "Laurent", roles: ["chef"], specialty: "cake" },
      { email: "chef.dessert@demo.com", password: "Demo123!", firstName: "Marco", lastName: "Rossi", roles: ["chef"], specialty: "dessert" },
      { email: "superadmin@demo.com", password: "SuperAdmin123!", firstName: "Super", lastName: "Admin", roles: ["admin", "super_admin"] },
    ];

    const results = [];
    const chefUserIds: { email: string; userId: string; specialty?: string }[] = [];

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

        // Track chef users for specialization setup
        if (user.roles.includes('chef') && (user as any).specialty) {
          chefUserIds.push({ email: user.email, userId: existingUser.id, specialty: (user as any).specialty });
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

        // Track chef users for specialization setup
        if (user.roles.includes('chef') && (user as any).specialty) {
          chefUserIds.push({ email: user.email, userId: authData.user.id, specialty: (user as any).specialty });
        }
      }

      results.push({ email: user.email, status: "created", roles: user.roles, userId: authData.user?.id });
    }

    // Setup chef specializations based on existing recipes
    const { data: recipes } = await supabaseAdmin.from('recipes').select('id, title');
    
    if (recipes && recipes.length > 0 && chefUserIds.length > 0) {
      // Distribute recipes among chefs based on keywords in title
      for (const chef of chefUserIds) {
        const matchingRecipes = recipes.filter(recipe => {
          const title = recipe.title.toLowerCase();
          if (chef.specialty === 'pastry') return title.includes('pastry') || title.includes('croissant') || title.includes('puff');
          if (chef.specialty === 'bread') return title.includes('bread') || title.includes('baguette') || title.includes('sourdough');
          if (chef.specialty === 'cake') return title.includes('cake') || title.includes('sponge') || title.includes('layer');
          if (chef.specialty === 'dessert') return title.includes('mousse') || title.includes('tart') || title.includes('chocolate') || title.includes('cream');
          return false;
        });

        // If no matching recipes found, assign first few recipes as fallback
        const recipesToAssign = matchingRecipes.length > 0 
          ? matchingRecipes 
          : recipes.slice(0, Math.min(3, recipes.length));

        for (const recipe of recipesToAssign) {
          // Check if specialization already exists
          const { data: existing } = await supabaseAdmin
            .from('chef_specializations')
            .select('id')
            .eq('chef_id', chef.userId)
            .eq('recipe_id', recipe.id)
            .single();

          if (!existing) {
            await supabaseAdmin.from('chef_specializations').insert({
              chef_id: chef.userId,
              recipe_id: recipe.id
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results, chefsWithSpecializations: chefUserIds }), {
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