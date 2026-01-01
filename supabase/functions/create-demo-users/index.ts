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

    const demoUsers = [
      // 5 Student Users
      { email: "arjun.verma@demo.com", password: "Student@123", firstName: "Arjun", lastName: "Verma", roles: ["student"] },
      { email: "priya.sharma@demo.com", password: "Student@123", firstName: "Priya", lastName: "Sharma", roles: ["student"] },
      { email: "rahul.mehta@demo.com", password: "Student@123", firstName: "Rahul", lastName: "Mehta", roles: ["student"] },
      { email: "ananya.patel@demo.com", password: "Student@123", firstName: "Ananya", lastName: "Patel", roles: ["student"] },
      { email: "vikram.singh@demo.com", password: "Student@123", firstName: "Vikram", lastName: "Singh", roles: ["student"] },
      
      // 4 Chef Users
      { email: "maria.fernandez@demo.com", password: "Chef@123", firstName: "Maria", lastName: "Fernandez", roles: ["chef"], specialty: "pastry" },
      { email: "pierre.dupont@demo.com", password: "Chef@123", firstName: "Pierre", lastName: "Dupont", roles: ["chef"], specialty: "bread" },
      { email: "sophie.laurent@demo.com", password: "Chef@123", firstName: "Sophie", lastName: "Laurent", roles: ["chef"], specialty: "cake" },
      { email: "marco.rossi@demo.com", password: "Chef@123", firstName: "Marco", lastName: "Rossi", roles: ["chef"], specialty: "dessert" },
      
      // 2 Admin Users
      { email: "neha.gupta@demo.com", password: "Admin@123", firstName: "Neha", lastName: "Gupta", roles: ["admin"] },
      { email: "rajesh.kumar@demo.com", password: "Admin@123", firstName: "Rajesh", lastName: "Kumar", roles: ["admin"] },
      
      // Super Admin (already exists but ensure it's there)
      { email: "superadmin@demo.com", password: "SuperAdmin123!", firstName: "Super", lastName: "Admin", roles: ["admin", "super_admin"] },
    ];

    const results = [];
    const chefUserIds: { email: string; userId: string; specialty?: string }[] = [];
    const studentUserIds: string[] = [];

    for (const user of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        // Ensure profile exists and is active
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

        if (user.roles.includes('chef') && (user as any).specialty) {
          chefUserIds.push({ email: user.email, userId: existingUser.id, specialty: (user as any).specialty });
        }
        
        if (user.roles.includes('student')) {
          studentUserIds.push(existingUser.id);
        }

        results.push({ email: user.email, password: user.password, status: "exists - ensured profile & roles", roles: user.roles, userId: existingUser.id });
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

      if (authData.user) {
        await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          account_status: 'active'
        });

        for (const role of user.roles) {
          await supabaseAdmin.from('user_roles').insert({
            user_id: authData.user.id,
            role: role
          });
        }

        if (user.roles.includes('chef') && (user as any).specialty) {
          chefUserIds.push({ email: user.email, userId: authData.user.id, specialty: (user as any).specialty });
        }
        
        if (user.roles.includes('student')) {
          studentUserIds.push(authData.user.id);
        }
      }

      results.push({ email: user.email, password: user.password, status: "created", roles: user.roles, userId: authData.user?.id });
    }

    // Setup chef specializations
    const { data: recipes } = await supabaseAdmin.from('recipes').select('id, title');
    
    if (recipes && recipes.length > 0 && chefUserIds.length > 0) {
      for (const chef of chefUserIds) {
        const matchingRecipes = recipes.filter(recipe => {
          const title = recipe.title.toLowerCase();
          if (chef.specialty === 'pastry') return title.includes('pastry') || title.includes('croissant') || title.includes('puff');
          if (chef.specialty === 'bread') return title.includes('bread') || title.includes('baguette') || title.includes('sourdough');
          if (chef.specialty === 'cake') return title.includes('cake') || title.includes('sponge') || title.includes('layer');
          if (chef.specialty === 'dessert') return title.includes('mousse') || title.includes('tart') || title.includes('chocolate') || title.includes('cream');
          return false;
        });

        const recipesToAssign = matchingRecipes.length > 0 
          ? matchingRecipes 
          : recipes.slice(0, Math.min(3, recipes.length));

        for (const recipe of recipesToAssign) {
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

    // Setup student enrollments for students
    const { data: courses } = await supabaseAdmin.from('courses').select('id, title');
    const { data: batches } = await supabaseAdmin.from('batches').select('id, course_id');
    
    if (courses && courses.length > 0 && batches && batches.length > 0 && studentUserIds.length > 0) {
      for (let i = 0; i < studentUserIds.length; i++) {
        const studentId = studentUserIds[i];
        const course = courses[i % courses.length];
        const batch = batches.find(b => b.course_id === course.id) || batches[0];
        
        // Check if enrollment exists
        const { data: existingEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('student_id', studentId)
          .eq('course_id', course.id)
          .single();
          
        if (!existingEnrollment) {
          await supabaseAdmin.from('enrollments').insert({
            student_id: studentId,
            course_id: course.id,
            batch_id: batch.id,
            status: 'active',
            progress: Math.floor(Math.random() * 60) + 10
          });
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
