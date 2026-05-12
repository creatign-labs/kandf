## Issue

Bookings now store arrays — `recipe_ids`, `assigned_chef_ids`, `table_numbers` — but several ingredient-calculation and chef-visibility code paths still read only the legacy singular columns (`recipe_id`, `assigned_chef_id`, `table_number`). Result: when a booking has 3 recipes / 2 chefs / 2 tables selected, only one recipe contributes to ingredient totals and only the chef in the singular slot sees the session.

### Where the bug lives

1. **`src/pages/ChefDashboard.tsx`** — `ingredientSummary` query (lines ~153–196):
   - Selects only `recipe_id` and counts each booking as 1 student × 1 recipe.
   - Filter uses `.eq('assigned_chef_id', user.id)` so chefs assigned via `assigned_chef_ids` are missed.
   - Same singular pattern in `todaysBatches` and `upcomingBookings` grouping (recipe key uses `b.recipe_id`).

2. **`src/pages/chef/DailyIngredients.tsx`** (lines ~52–146):
   - Bookings query uses `.eq('assigned_chef_id', user.id)` and `.not('recipe_id', 'is', null)`, then increments student count per booking by 1 against `booking.recipe_id` only. Multi-recipe bookings under-count by `(N-1)/N`.

3. **`src/pages/admin/InventoryChecklist.tsx`** (lines ~73–130):
   - `studentCount = bookingsData.length` and ingredient relevance is filtered by course only. A booking that explicitly selected 3 specific recipes is still treated as "all recipes for that course × 1 student". Per-recipe demand is wrong in both directions.

4. **`supabase/functions/slot-reminders/index.ts`** (line 42 + 124) — singular `recipe_id` / `table_number` in the reminder payload.

5. **`supabase/functions/daily-ingredient-push/index.ts`** — already updated in the previous turn; honored as the reference pattern.

## Fix plan

Apply one consistent rule everywhere ingredients or chef-visibility are computed:

> The recipes scheduled for a booking = `recipe_ids` ∪ `recipe_id` (legacy fallback). The chefs assigned to a booking = `assigned_chef_ids` ∪ `assigned_chef_id`. Each booking contributes **1 student per resolved recipe** to ingredient totals.

### File-by-file changes

1. **`src/pages/ChefDashboard.tsx`**
   - `ingredientSummary`: select `recipe_id, recipe_ids, assigned_chef_id, assigned_chef_ids`. Drop the singular `.eq` chef filter; fetch by date+status, then in JS keep bookings where `user.id` is in either field. For each kept booking, iterate the merged unique recipe list and increment that recipe's student count by 1.
   - `todaysBatches` / `upcomingBookings`: same chef filter relaxation; expand each booking into one row per resolved recipe so multi-recipe sessions show every recipe.

2. **`src/pages/chef/DailyIngredients.tsx`**
   - Same chef filter change (membership-in-array), same recipe expansion in `getRecipeStudentCount` so each recipe in `recipe_ids` counts the student.
   - Recipes title lookup: replace the single `recipes(id, title)` join with a follow-up `recipes` fetch keyed by the union of resolved recipe IDs.

3. **`src/pages/admin/InventoryChecklist.tsx`**
   - Replace the "all course recipes × total bookings" aggregation with explicit per-booking expansion:
     - For each booking, resolve recipes (`recipe_ids` ∪ `recipe_id`); if empty, fall back to all `course_recipes` for the booking's `course_id`.
     - For every (booking → recipe) pair, add `quantity_per_student × 1` to each ingredient on that recipe.
   - Keeps the existing junction-aware query but removes the inflated/under-count behavior.

4. **`supabase/functions/slot-reminders/index.ts`**
   - Select and render the array fields; show all assigned recipe titles and all table numbers in the reminder payload (small change, no schema impact).

5. **No DB schema changes.** Singular columns stay as legacy fallbacks.

### Verification

- Re-deploy `daily-ingredient-push` and `slot-reminders`.
- Spot-check with a booking that has 2 recipes + 2 chefs + 2 tables: ChefDashboard ingredient summary should sum both recipes, both chefs should see the session, InventoryChecklist for that day should reflect both recipes' demand.

Awaiting approval before I make these edits.