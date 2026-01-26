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

    // Demo users for all flows testing
    const demoUsers: Array<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roles: string[];
      accountStatus: string;
      needsEnrollment: boolean;
    }> = [
      {
        email: "student@demo.com",
        password: "Demo123!",
        firstName: "Demo",
        lastName: "Student",
        roles: ['student'],
        accountStatus: 'active', // Set to active for immediate testing
        needsEnrollment: true
      },
      {
        email: "student2@demo.com",
        password: "Demo123!",
        firstName: "Test",
        lastName: "Student2",
        roles: ['student'],
        accountStatus: 'pending', // For Flow 1 testing
        needsEnrollment: false
      },
      {
        email: "chef@demo.com",
        password: "Chef123!",
        firstName: "Demo",
        lastName: "Chef",
        roles: ['chef'],
        accountStatus: 'active',
        needsEnrollment: false
      },
      {
        email: "admin@demo.com",
        password: "Admin@123",
        firstName: "Demo",
        lastName: "Admin",
        roles: ['admin'],
        accountStatus: 'active',
        needsEnrollment: false
      },
      {
        email: "superadmin@demo.com",
        password: "SuperAdmin123!",
        firstName: "Super",
        lastName: "Admin",
        roles: ['admin', 'super_admin'],
        accountStatus: 'active',
        needsEnrollment: false
      },
      {
        email: "vendor@demo.com",
        password: "Vendor123!",
        firstName: "Demo",
        lastName: "Vendor",
        roles: ['vendor'],
        accountStatus: 'active',
        needsEnrollment: false
      }
    ];

    const createdUsers: Array<{ 
      email: string; 
      password: string; 
      userId?: string; 
      roles: readonly string[]; 
      accountStatus: string 
    }> = [];

    const courseId = 'a1111111-1111-1111-1111-111111111111'; // Foundation Baking

    for (const user of demoUsers) {
      // Create auth user with confirmed email
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
        // Create profile with email
        await supabaseAdmin.from('profiles').upsert({
          id: authData.user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          account_status: user.accountStatus
        }, { onConflict: 'id' });

        // Assign roles
        for (const role of user.roles) {
          await supabaseAdmin.from('user_roles').upsert({
            user_id: authData.user.id,
            role: role
          }, { onConflict: 'user_id,role' });
        }

        // Create enrollment for student that needs it
        if (user.needsEnrollment) {
          // First, ensure we have a future batch
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          const batchId = 'demo-batch-' + Date.now().toString().slice(-8);
          
          // Create a demo batch for booking
          await supabaseAdmin.from('batches').upsert({
            id: batchId,
            course_id: courseId,
            batch_name: 'Demo Foundation Batch',
            time_slot: '10:00 AM - 1:00 PM',
            days: ['Monday', 'Wednesday', 'Friday'],
            total_seats: 20,
            available_seats: 18,
            start_date: tomorrowStr
          }, { onConflict: 'id' });

          // Create enrollment
          await supabaseAdmin.from('enrollments').insert({
            student_id: authData.user.id,
            course_id: courseId,
            batch_id: batchId,
            status: 'active',
            enrollment_date: new Date().toISOString().split('T')[0],
            progress: 0,
            payment_completed: false,
            attendance_completed: false
          });
        }

        // Add chef specializations if chef
        if (user.roles.includes('chef')) {
          const recipes = await supabaseAdmin
            .from('recipes')
            .select('id')
            .eq('course_id', courseId)
            .limit(3);
          
          if (recipes.data) {
            for (const recipe of recipes.data) {
              await supabaseAdmin.from('chef_specializations').upsert({
                chef_id: authData.user.id,
                recipe_id: recipe.id
              }, { onConflict: 'chef_id,recipe_id' });
            }
          }
        }

        // Create vendor profile if vendor
        if (user.roles.includes('vendor')) {
          await supabaseAdmin.from('vendor_profiles').upsert({
            user_id: authData.user.id,
            company_name: 'Demo Bakery Co.',
            company_description: 'A demo vendor company for testing the job portal functionality.',
            contact_email: user.email,
            contact_phone: '+91 98765 43210',
            website: 'https://demo-bakery.example.com',
            is_active: true
          }, { onConflict: 'user_id' });

          // Create a demo job posting
          const { data: vendorProfile } = await supabaseAdmin
            .from('vendor_profiles')
            .select('id')
            .eq('user_id', authData.user.id)
            .single();

          if (vendorProfile) {
            await supabaseAdmin.from('jobs').insert({
              vendor_id: vendorProfile.id,
              title: 'Junior Pastry Chef',
              company: 'Demo Bakery Co.',
              location: 'Mumbai, India',
              type: 'Full-time',
              salary_range: '₹25,000 - ₹35,000/month',
              description: 'We are looking for a passionate junior pastry chef to join our team. You will assist in preparing pastries, cakes, and desserts for our customers. This is a demo job posting for testing purposes.',
              is_active: true
            });
          }
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

    // Create future batches for booking tests (next 7 days)
    const futureBatches = [];
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      futureBatches.push({
        id: `future-batch-${i}-${Date.now().toString().slice(-6)}`,
        course_id: courseId,
        batch_name: `Foundation Batch Day ${i}`,
        time_slot: i % 2 === 0 ? '10:00 AM - 1:00 PM' : '2:00 PM - 5:00 PM',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        total_seats: 15,
        available_seats: 15,
        start_date: dateStr
      });
    }
    
    for (const batch of futureBatches) {
      await supabaseAdmin.from('batches').upsert(batch, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deletedEmails,
      createdUsers,
      futureBatchesCreated: futureBatches.length,
      message: "Demo accounts created with test data - ready for all 9 flows"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("create-demo-users error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
