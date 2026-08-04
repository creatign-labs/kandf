-- 1. Remove public read on lead_installments (no client reads it; edge functions use service role)
DROP POLICY IF EXISTS "Public can view installments by id" ON public.lead_installments;

-- 2. Assessment questions: signed-in users only (contains correct_answer)
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Authenticated users can view questions"
ON public.questions FOR SELECT TO authenticated USING (true);

-- 3. Vendors may only view applications belonging to their own jobs
DROP POLICY IF EXISTS "Vendors can view released applications" ON public.job_applications;
CREATE POLICY "Vendors can view released applications for their jobs"
ON public.job_applications FOR SELECT TO authenticated
USING (
  released_to_vendor = true
  AND has_role(auth.uid(), 'vendor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.vendor_profiles vp ON vp.id = j.vendor_id
    WHERE j.id = job_applications.job_id AND vp.user_id = auth.uid()
  )
);