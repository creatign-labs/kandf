CREATE POLICY "Chefs can view recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role));