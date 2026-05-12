-- Junction table for many-to-many course <-> recipe linking
CREATE TABLE IF NOT EXISTS public.course_recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (course_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_course_recipes_course ON public.course_recipes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_recipes_recipe ON public.course_recipes(recipe_id);

ALTER TABLE public.course_recipes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read links (recipes/courses are already broadly readable)
CREATE POLICY "Anyone can view course_recipes"
ON public.course_recipes FOR SELECT
USING (true);

-- Only admins/super_admins can manage links
CREATE POLICY "Admins can insert course_recipes"
ON public.course_recipes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete course_recipes"
ON public.course_recipes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Backfill from existing recipes.course_id values (preserve current single-course links)
INSERT INTO public.course_recipes (course_id, recipe_id)
SELECT r.course_id, r.id
FROM public.recipes r
WHERE r.course_id IS NOT NULL
ON CONFLICT (course_id, recipe_id) DO NOTHING;