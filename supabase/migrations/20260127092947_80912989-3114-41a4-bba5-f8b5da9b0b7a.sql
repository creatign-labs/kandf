-- Drop and recreate the vendor policy for job_applications
-- This allows vendors to see released applications regardless of vendor_id
DROP POLICY IF EXISTS "Vendors can view released applications for their jobs" ON public.job_applications;

CREATE POLICY "Vendors can view released applications"
ON public.job_applications
FOR SELECT
USING (
  released_to_vendor = true 
  AND has_role(auth.uid(), 'vendor'::app_role)
);

-- Also update profiles policy to allow vendors to view profiles of released applicants
DROP POLICY IF EXISTS "Vendors can view released applicant profiles" ON public.profiles;

CREATE POLICY "Vendors can view released applicant profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM job_applications ja
    WHERE ja.student_id = profiles.id
    AND ja.released_to_vendor = true
  )
);