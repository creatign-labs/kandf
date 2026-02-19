
-- 1. Add session_notes column to recipe_batches for chef notes
ALTER TABLE public.recipe_batches 
ADD COLUMN IF NOT EXISTS session_notes text,
ADD COLUMN IF NOT EXISTS session_notes_by uuid,
ADD COLUMN IF NOT EXISTS session_notes_at timestamptz,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- 2. Create approval_requests table for admin→superadmin workflow
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  request_type text NOT NULL, -- 'reset_no_show', 'modify_fee', 'extend_course', 'unlock_account', 'refund'
  entity_type text NOT NULL, -- 'student', 'enrollment', 'payment'
  entity_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create approval requests"
ON public.approval_requests FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view approval requests"
ON public.approval_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update approval requests"
ON public.approval_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Create audit_logs table for superadmin governance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Update leads stage pipeline: add 'visited' stage support
-- (No schema change needed, just data convention: new → contacted → visited → converted → lost)

-- 5. Add hires tracking for vendor
ALTER TABLE public.job_applications 
ADD COLUMN IF NOT EXISTS vendor_status text DEFAULT NULL; 
-- vendor_status: shortlisted, interview_scheduled, offered, hired, rejected

-- 6. Create trigger for updated_at on approval_requests
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
