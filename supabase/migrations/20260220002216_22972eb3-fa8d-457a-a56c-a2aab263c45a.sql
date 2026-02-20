-- Step 1: Create a resume_access_logs table for audit trail
CREATE TABLE public.resume_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_user_id uuid NOT NULL,
  student_id uuid NOT NULL,
  job_application_id uuid NOT NULL,
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/super admins can view audit logs
CREATE POLICY "Admins can view resume access logs"
ON public.resume_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Vendors can insert their own access logs (logged automatically via RPC)
CREATE POLICY "System can insert resume access logs"
ON public.resume_access_logs
FOR INSERT
WITH CHECK (auth.uid() = vendor_user_id);

-- No UPDATE or DELETE allowed

-- Step 2: Drop the existing vendor SELECT policy on resumes
DROP POLICY IF EXISTS "Vendors can view released applicant resumes" ON public.resumes;

-- Step 3: Create a hardened vendor policy with 30-day time restriction
CREATE POLICY "Vendors can view released applicant resumes within 30 days"
ON public.resumes
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role)
  AND EXISTS (
    SELECT 1
    FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN vendor_profiles vp ON vp.id = j.vendor_id
    WHERE ja.student_id = resumes.student_id
      AND ja.released_to_vendor = true
      AND vp.user_id = auth.uid()
      -- Time-based restriction: only within 30 days of release
      AND ja.released_at IS NOT NULL
      AND ja.released_at > (now() - interval '30 days')
  )
);

-- Step 4: Create an RPC for vendors to access resumes with audit logging
CREATE OR REPLACE FUNCTION public.get_student_resume_with_audit(p_student_id uuid, p_job_application_id uuid)
RETURNS SETOF resumes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a vendor with access to this released application
  IF NOT has_role(auth.uid(), 'vendor'::app_role) THEN
    RAISE EXCEPTION 'Only vendors can access student resumes';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN vendor_profiles vp ON vp.id = j.vendor_id
    WHERE ja.id = p_job_application_id
      AND ja.student_id = p_student_id
      AND ja.released_to_vendor = true
      AND vp.user_id = auth.uid()
      AND ja.released_at IS NOT NULL
      AND ja.released_at > (now() - interval '30 days')
  ) THEN
    RAISE EXCEPTION 'Access denied or application release has expired';
  END IF;

  -- Log the access
  INSERT INTO resume_access_logs (vendor_user_id, student_id, job_application_id)
  VALUES (auth.uid(), p_student_id, p_job_application_id);

  -- Return the resume
  RETURN QUERY SELECT * FROM resumes WHERE student_id = p_student_id;
END;
$$;