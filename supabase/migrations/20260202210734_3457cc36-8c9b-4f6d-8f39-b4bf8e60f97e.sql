-- Update mark_advance_paid function to use enrollment_status
CREATE OR REPLACE FUNCTION public.mark_advance_paid(p_student_id uuid, p_payment_id text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET enrollment_status = 'enrolled',
      updated_at = now()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update check_student_login_eligibility if it exists and references account_status
-- First check what functions reference account_status and update them