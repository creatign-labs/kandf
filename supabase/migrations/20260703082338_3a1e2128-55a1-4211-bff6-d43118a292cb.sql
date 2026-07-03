DROP POLICY IF EXISTS "Students can create applications with eligibility check" ON public.job_applications;
CREATE POLICY "Students can create own applications" ON public.job_applications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);