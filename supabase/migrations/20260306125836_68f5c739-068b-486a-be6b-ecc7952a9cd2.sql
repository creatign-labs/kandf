-- Allow super admins to delete payment_schedules
CREATE POLICY "Super admins can delete payment schedules"
ON public.payment_schedules
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));