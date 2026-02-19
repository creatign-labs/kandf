
-- Allow vendors to update vendor_status on released applications for their jobs
CREATE POLICY "Vendors can update vendor_status on released applications"
ON public.job_applications
FOR UPDATE
USING (
  released_to_vendor = true
  AND has_role(auth.uid(), 'vendor'::app_role)
  AND EXISTS (
    SELECT 1 FROM jobs j
    JOIN vendor_profiles vp ON vp.id = j.vendor_id
    WHERE j.id = job_applications.job_id
    AND vp.user_id = auth.uid()
  )
)
WITH CHECK (
  released_to_vendor = true
  AND has_role(auth.uid(), 'vendor'::app_role)
);
