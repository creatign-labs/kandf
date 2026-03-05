CREATE POLICY "Super admins can delete enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));