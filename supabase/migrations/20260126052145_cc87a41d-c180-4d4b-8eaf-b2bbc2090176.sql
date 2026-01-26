-- Add must_change_password flag to profiles for first-login enforcement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Add booking_enabled flag to batches for admin-controlled slot toggle
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT true;

-- Create account_hold_reason table to track hold/rejection reasons
CREATE TABLE IF NOT EXISTS public.account_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  reason text,
  changed_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on account_status_logs
ALTER TABLE public.account_status_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins and admins can view status logs
CREATE POLICY "Super admins can view all status logs"
  ON public.account_status_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all status logs"
  ON public.account_status_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only super admins can insert status logs
CREATE POLICY "Super admins can insert status logs"
  ON public.account_status_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Create notification_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  sent_by uuid NOT NULL,
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all notification logs
CREATE POLICY "Super admins can view all notification logs"
  ON public.notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can view notification logs they sent
CREATE POLICY "Admins can view own notification logs"
  ON public.notification_logs FOR SELECT
  USING (auth.uid() = sent_by);

-- Admins can insert notification logs
CREATE POLICY "Admins can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update approve-student function to set must_change_password
CREATE OR REPLACE FUNCTION public.set_student_must_change_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes from advance_paid to active, require password change
  IF OLD.account_status = 'advance_paid' AND NEW.account_status = 'active' THEN
    NEW.must_change_password := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for must_change_password
DROP TRIGGER IF EXISTS trigger_set_must_change_password ON public.profiles;
CREATE TRIGGER trigger_set_must_change_password
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_must_change_password();

-- Function to log account status changes
CREATE OR REPLACE FUNCTION public.log_account_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO account_status_logs (student_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.account_status, NEW.account_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS trigger_log_account_status_change ON public.profiles;
CREATE TRIGGER trigger_log_account_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_account_status_change();