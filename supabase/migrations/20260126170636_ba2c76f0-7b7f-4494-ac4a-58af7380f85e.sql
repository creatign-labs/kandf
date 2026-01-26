-- Add RLS policy to allow students to update their own payment schedules
CREATE POLICY "Students can update own payment schedules"
ON public.payment_schedules
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Also ensure students can view their own payment schedules (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_schedules' 
    AND policyname = 'Students can view own payment schedules'
  ) THEN
    CREATE POLICY "Students can view own payment schedules"
    ON public.payment_schedules
    FOR SELECT
    USING (auth.uid() = student_id);
  END IF;
END $$;

-- Allow admins to manage all payment schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_schedules' 
    AND policyname = 'Admins can manage all payment schedules'
  ) THEN
    CREATE POLICY "Admins can manage all payment schedules"
    ON public.payment_schedules
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;