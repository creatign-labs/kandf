-- Add unique constraint for student_recipe_progress upsert
ALTER TABLE public.student_recipe_progress 
ADD CONSTRAINT student_recipe_progress_student_recipe_unique 
UNIQUE (student_id, recipe_id);