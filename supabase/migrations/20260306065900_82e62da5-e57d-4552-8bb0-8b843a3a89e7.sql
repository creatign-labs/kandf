CREATE POLICY "Chefs can view student profiles for assigned bookings"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'chef'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.student_id = profiles.id
        AND b.assigned_chef_id = auth.uid()
    )
    OR auth.uid() = id
  )
);