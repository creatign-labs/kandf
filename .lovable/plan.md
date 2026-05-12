## Goal

Make every "recipes for a course" / "course for a recipe" read go through the new `course_recipes` junction table, so recipes linked to multiple courses appear correctly in all portals.

`recipes.course_id` stays in the schema for now (legacy/backfill), but no read path should rely on it.

## Files to update

### Student portal
1. **`src/pages/student/MyCourse.tsx`** — recipe list and progress query currently `recipes.eq('course_id', enrollment.course_id)`. Switch to `course_recipes.select('recipe:recipes(*)').eq('course_id', enrollment.course_id)` and flatten.
2. **`src/pages/student/RecipeDetail.tsx`** — eligibility check that compares `recipes.course_id` to enrollment's course. Switch to `course_recipes` lookup (`exists where recipe_id = X and course_id = enrollment.course_id`).
3. **`src/pages/student/OnlineClasses.tsx`** — recipe list filter by course. Switch to junction-based join.
4. **`src/pages/StudentDashboard.tsx`** — "recipe-progress-dashboard" count of recipes per course. Switch to `course_recipes` count.

### Admin portal
5. **`src/pages/admin/AdminRecipes.tsx`** — load recipes with their course(s) via `course_recipes` join; the `courseFilter` becomes a junction filter instead of `recipe.course_id`.
6. **`src/pages/admin/RecipeInventory.tsx`** — same pattern for course filter.
7. **`src/pages/admin/RecipeIngredients.tsx`** — recipe list keyed by course.
8. **`src/pages/admin/BookingRecipeAssignment.tsx`** — recipe options for a booking should include any recipe linked to that course via junction.
9. **`src/pages/admin/InventoryChecklist.tsx`** — `recipe_ingredients` join currently uses `recipes.course_id` to scope ingredients per course; switch to `course_recipes` membership check.
10. **`src/components/admin/OnlineClassManager.tsx`** — recipe dropdown filtered by enrollment course.

### Chef portal
11. **`src/pages/chef/Recipes.tsx`** — recipes list with `courses(...)` join and `recipe.course_id` filter. Replace with `course_recipes(course:courses(id,title))` and filter via junction membership; show all linked courses as badges (a recipe may now have multiple).

### Hooks
12. **`src/hooks/useRecipeBooking.ts`** — two `recipes.eq('course_id', courseId)` lookups for slot booking (lines ~85, ~125). Switch to junction-based filtering.
13. **`src/hooks/useAdminRecipeBatches.ts`** — `query.eq('course_id', courseFilter)` on recipes. Switch to junction filter (e.g. `recipe_id in (select recipe_id from course_recipes where course_id = X)`).

### Edge functions
14. **`supabase/functions/daily-ingredient-push/index.ts`** — reads `recipe.course_id` from a single recipe. If the function only needs *a* course label, keep it (it's denormalized convenience); if it needs every linked course, switch to `course_recipes`. Decision noted in Open Questions.

## Files NOT changing
- `src/pages/admin/Courses.tsx` — already uses `course_recipes` (write path).
- `src/integrations/supabase/types.ts` — auto-generated.
- `recipes.course_id` column — left in place for now; can be dropped in a future cleanup migration once all reads are gone.
- `bookings.course_id`, `enrollments.course_id`, `chef_specializations`, `recipe_batches` — these are not "recipes-belong-to-course" relationships and are out of scope.
- `DataTemplate.tsx`, `create-demo-users` — bulk import/seed code that writes `recipes.course_id` directly. Will additionally insert into `course_recipes` so seeded data shows up in the new junction-based reads.

## Query pattern (reference)

Replace:
```ts
supabase.from('recipes').select('*').eq('course_id', courseId)
```
with:
```ts
supabase
  .from('course_recipes')
  .select('recipe:recipes(*)')
  .eq('course_id', courseId)
  .then(r => (r.data ?? []).map(x => x.recipe).filter(Boolean))
```

Replace single-recipe → course lookups:
```ts
recipe.course_id === enrollment.course_id
```
with an `exists` query against `course_recipes` (or include `course_recipes(course_id)` in the recipe select and check `.some(...)`).

## Open questions

1. **Chef Recipes UI** — show all linked courses as multiple badges, or just the first? (Current UI assumes one badge.)
2. **`daily-ingredient-push`** — should the per-recipe push include every course the recipe is linked to, or keep the legacy single `course_id`? Most likely fine to leave as-is since it's metadata only.
3. **Seed/import scripts** (`DataTemplate.tsx`, `create-demo-users`) — also mirror writes into `course_recipes`? Recommended yes, otherwise seeded recipes won't appear in the new course-scoped lists.

Confirm answers (or say "use sensible defaults" — multiple badges, leave edge function alone, mirror writes in seeders) and I'll implement.
