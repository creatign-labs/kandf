
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS recipe_code text;

CREATE POLICY "Super admins can manage all attendance" ON public.attendance FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage recipes" ON public.recipes FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
