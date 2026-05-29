DROP POLICY IF EXISTS "Enrolled students can view recipes" ON public.recipes;

CREATE POLICY "Enrolled students can view recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.course_recipes cr
    JOIN public.enrollments e
      ON e.course_id = cr.course_id
    WHERE cr.recipe_id = recipes.id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
  )
);