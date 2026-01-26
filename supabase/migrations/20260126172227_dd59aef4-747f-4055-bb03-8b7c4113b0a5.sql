-- Fix the broken RLS policy on recipe_batches
-- The policy was comparing rbm.recipe_batch_id = rbm.id (wrong!)
-- It should compare rbm.recipe_batch_id = recipe_batches.id

DROP POLICY IF EXISTS "Students can view their enrolled recipe batches" ON public.recipe_batches;

CREATE POLICY "Students can view their enrolled recipe batches" 
ON public.recipe_batches 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipe_batch_memberships rbm
    WHERE rbm.recipe_batch_id = recipe_batches.id 
    AND rbm.student_id = auth.uid()
  )
);