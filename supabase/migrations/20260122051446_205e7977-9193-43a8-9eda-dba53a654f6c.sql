-- Allow super admins to delete student access approvals
CREATE POLICY "Super admins can delete access approvals"
ON public.student_access_approvals
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));