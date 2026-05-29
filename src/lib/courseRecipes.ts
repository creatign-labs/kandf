import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all recipes linked to a course via the course_recipes junction table.
 * Returns recipes ordered by created_at (oldest first).
 */
export async function fetchRecipesForCourse(courseId: string) {
  // Order by when each recipe was added to THIS course so the list reflects
  // the course's curriculum sequence (not the global recipe creation order).
  const { data, error } = await supabase
    .from("course_recipes")
    .select("created_at, recipe:recipes(*)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.recipe)
    .filter(Boolean);
}

/** Count of recipes linked to a course. */
export async function countRecipesForCourse(courseId: string) {
  const { count, error } = await supabase
    .from("course_recipes")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  if (error) throw error;
  return count || 0;
}

/** Returns the set of course_ids a given recipe belongs to. */
export async function fetchCourseIdsForRecipe(recipeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("course_recipes")
    .select("course_id")
    .eq("recipe_id", recipeId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.course_id);
}

/** Returns recipe_ids linked to a given course (just the IDs). */
export async function fetchRecipeIdsForCourse(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("course_recipes")
    .select("recipe_id")
    .eq("course_id", courseId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.recipe_id);
}
