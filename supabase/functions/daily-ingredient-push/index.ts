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

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Processing ingredient push for date: ${tomorrowStr}`);

    // Get all confirmed bookings for tomorrow
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        student_id,
        course_id,
        recipe_id,
        recipe_ids,
        time_slot
      `)
      .eq('booking_date', tomorrowStr)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings for tomorrow');
      return new Response(JSON.stringify({
        success: true,
        message: 'No bookings for tomorrow',
        notificationsSent: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${bookings.length} bookings for tomorrow`);

    // Resolve the set of recipes per booking. Prefer explicitly assigned
    // recipes (recipe_ids array, then legacy recipe_id). If none are assigned
    // but the booking has a course, fall back to all recipes linked to that
    // course via the course_recipes junction table.
    const courseIdsNeedingFallback = new Set<string>();
    for (const b of bookings) {
      const explicit = [
        ...((b as any).recipe_ids || []),
        ...(b.recipe_id ? [b.recipe_id] : []),
      ].filter(Boolean);
      if (explicit.length === 0 && b.course_id) {
        courseIdsNeedingFallback.add(b.course_id);
      }
    }

    const courseToRecipes: Record<string, string[]> = {};
    if (courseIdsNeedingFallback.size > 0) {
      const { data: junctionRows, error: junctionErr } = await supabaseAdmin
        .from('course_recipes')
        .select('course_id, recipe_id')
        .in('course_id', Array.from(courseIdsNeedingFallback));
      if (junctionErr) {
        console.error('Error fetching course_recipes:', junctionErr);
        throw junctionErr;
      }
      for (const row of junctionRows || []) {
        if (!courseToRecipes[row.course_id]) courseToRecipes[row.course_id] = [];
        courseToRecipes[row.course_id].push(row.recipe_id);
      }
    }

    // Group bookings by recipe
    const recipeGroups: Record<string, { recipeId: string; recipeTitle: string; studentCount: number; timeSlots: Set<string> }> = {};

    for (const booking of bookings) {
      const explicit = [
        ...((booking as any).recipe_ids || []),
        ...(booking.recipe_id ? [booking.recipe_id] : []),
      ].filter(Boolean);
      const resolved: string[] = explicit.length > 0
        ? Array.from(new Set(explicit))
        : (booking.course_id ? (courseToRecipes[booking.course_id] || []) : []);

      for (const rid of resolved) {
        if (!recipeGroups[rid]) {
          recipeGroups[rid] = {
            recipeId: rid,
            recipeTitle: '',
            studentCount: 0,
            timeSlots: new Set()
          };
        }
        recipeGroups[rid].studentCount++;
        recipeGroups[rid].timeSlots.add(booking.time_slot);
      }
    }

    // Fetch titles for all resolved recipes
    const resolvedRecipeIds = Object.keys(recipeGroups);
    if (resolvedRecipeIds.length === 0) {
      console.log('No recipes resolved for tomorrow bookings');
      return new Response(JSON.stringify({
        success: true,
        message: 'No recipes resolved for tomorrow bookings',
        notificationsSent: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: recipeRows } = await supabaseAdmin
      .from('recipes')
      .select('id, title')
      .in('id', resolvedRecipeIds);
    for (const r of recipeRows || []) {
      if (recipeGroups[r.id]) recipeGroups[r.id].recipeTitle = r.title;
    }

    // Get recipe ingredients for all recipes
    const recipeIds = Object.keys(recipeGroups);
    const { data: recipeIngredients, error: ingredientsError } = await supabaseAdmin
      .from('recipe_ingredients')
      .select(`
        recipe_id,
        quantity_per_student,
        inventory (
          id,
          name,
          unit,
          current_stock
        )
      `)
      .in('recipe_id', recipeIds);

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError);
      throw ingredientsError;
    }

    // Calculate total ingredient requirements
    const ingredientTotals: Record<string, { 
      name: string; 
      unit: string; 
      required: number; 
      currentStock: number;
      shortfall: number;
    }> = {};

    for (const ri of recipeIngredients || []) {
      const invData = ri.inventory as unknown;
      const inv = invData as { id: string; name: string; unit: string; current_stock: number } | null;
      if (!inv) continue;
      
      const recipeGroup = recipeGroups[ri.recipe_id];
      if (!recipeGroup) continue;
      
      const requiredQty = ri.quantity_per_student * recipeGroup.studentCount;
      
      if (!ingredientTotals[inv.id]) {
        ingredientTotals[inv.id] = {
          name: inv.name,
          unit: inv.unit,
          required: 0,
          currentStock: inv.current_stock,
          shortfall: 0
        };
      }
      ingredientTotals[inv.id].required += requiredQty;
    }

    // Calculate shortfalls
    for (const id of Object.keys(ingredientTotals)) {
      const item = ingredientTotals[id];
      item.shortfall = Math.max(0, item.required - item.currentStock);
    }

    // Build notification message
    const recipeList = Object.values(recipeGroups)
      .map(r => `• ${r.recipeTitle}: ${r.studentCount} student(s)`)
      .join('\n');

    const shortfalls = Object.values(ingredientTotals)
      .filter(i => i.shortfall > 0)
      .map(i => `• ${i.name}: need ${i.shortfall} ${i.unit} more`)
      .join('\n');

    const notificationTitle = `📋 Tomorrow's Class Prep (${tomorrowStr})`;
    let notificationMessage = `Recipes scheduled:\n${recipeList}`;
    
    if (shortfalls) {
      notificationMessage += `\n\n⚠️ Low Stock Alert:\n${shortfalls}`;
    }

    // Get all chefs
    const { data: chefs, error: chefsError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'chef');

    if (chefsError) {
      console.error('Error fetching chefs:', chefsError);
      throw chefsError;
    }

    // Send notifications to all chefs
    const notifications = (chefs || []).map(chef => ({
      user_id: chef.user_id,
      title: notificationTitle,
      message: notificationMessage,
      type: 'ingredient_alert',
      read: false
    }));

    if (notifications.length > 0) {
      const { error: notifyError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.error('Error sending notifications:', notifyError);
        throw notifyError;
      }
    }

    console.log(`Sent ${notifications.length} notifications to chefs`);

    return new Response(JSON.stringify({ 
      success: true, 
      date: tomorrowStr,
      recipesCount: recipeIds.length,
      totalStudents: bookings.length,
      notificationsSent: notifications.length,
      shortfallItems: Object.values(ingredientTotals).filter(i => i.shortfall > 0).length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("daily-ingredient-push error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
