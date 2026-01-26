-- Update create_payment_schedule function with correct logic
-- Registration fee is marked as PAID (already collected as advance payment)
-- Balance 1 = 50% of remaining, due in 7 days
-- Balance 2 = 50% of remaining, due in 30 days

CREATE OR REPLACE FUNCTION public.create_payment_schedule(
  p_enrollment_id uuid, 
  p_student_id uuid, 
  p_total_amount numeric, 
  p_registration_amount numeric DEFAULT 2000, 
  p_due_days_1 integer DEFAULT 7, 
  p_due_days_2 integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reg_amount NUMERIC;
  v_balance_amount NUMERIC;
  v_balance_1 NUMERIC;
  v_balance_2 NUMERIC;
BEGIN
  -- Registration amount (advance payment already made)
  v_reg_amount := COALESCE(p_registration_amount, 2000);
  
  -- Remaining balance after registration
  v_balance_amount := p_total_amount - v_reg_amount;
  
  -- Balance 1 = 50% of remaining
  v_balance_1 := ROUND(v_balance_amount * 0.5, 2);
  
  -- Balance 2 = remaining after Balance 1
  v_balance_2 := v_balance_amount - v_balance_1;
  
  -- Insert registration payment (marked as PAID since advance payment was collected)
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status, paid_at)
  VALUES (p_enrollment_id, p_student_id, 'registration', v_reg_amount, CURRENT_DATE, 'paid', NOW());
  
  -- Insert balance 1 (pending, due in 7 days)
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status)
  VALUES (p_enrollment_id, p_student_id, 'balance_1', v_balance_1, CURRENT_DATE + p_due_days_1, 'pending');
  
  -- Insert balance 2 (pending, due in 30 days)
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status)
  VALUES (p_enrollment_id, p_student_id, 'balance_2', v_balance_2, CURRENT_DATE + p_due_days_2, 'pending');
END;
$function$;