-- 1. Function to check certificate eligibility
CREATE OR REPLACE FUNCTION public.check_certificate_eligibility(p_student_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_pending_payments INTEGER;
BEGIN
  -- Get enrollment
  SELECT * INTO v_enrollment 
  FROM enrollments 
  WHERE student_id = p_student_id AND course_id = p_course_id AND status = 'active';
  
  IF v_enrollment IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check progress is 100%
  IF v_enrollment.progress < 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Check payment completed
  IF NOT COALESCE(v_enrollment.payment_completed, FALSE) THEN
    -- Check payment_schedules for any pending payments
    SELECT COUNT(*) INTO v_pending_payments
    FROM payment_schedules
    WHERE enrollment_id = v_enrollment.id AND status IN ('pending', 'overdue');
    
    IF v_pending_payments > 0 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check attendance completed
  IF NOT COALESCE(v_enrollment.attendance_completed, FALSE) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 2. Update certificate trigger to use new eligibility check
CREATE OR REPLACE FUNCTION public.trigger_auto_generate_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when all conditions are met:
  -- 1. Progress = 100
  -- 2. Payment completed
  -- 3. Attendance completed
  IF NEW.progress = 100 
     AND COALESCE(NEW.payment_completed, FALSE) = TRUE 
     AND COALESCE(NEW.attendance_completed, FALSE) = TRUE THEN
    -- Check if certificate doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM certificates 
      WHERE student_id = NEW.student_id AND course_id = NEW.course_id
    ) THEN
      -- Insert certificate
      INSERT INTO certificates (student_id, course_id, certificate_number, status)
      VALUES (
        NEW.student_id,
        NEW.course_id,
        generate_certificate_number(NEW.course_id),
        'issued'
      );
      
      -- Create notification for student
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.student_id,
        'Certificate Earned!',
        'Congratulations! You have successfully completed the course and earned your certificate.',
        'success'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS auto_generate_certificate_trigger ON enrollments;
CREATE TRIGGER auto_generate_certificate_trigger
AFTER UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_generate_certificate();

-- 4. Function to update overdue payment statuses
CREATE OR REPLACE FUNCTION public.update_overdue_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE payment_schedules
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. Function to create payment schedule for enrollment
CREATE OR REPLACE FUNCTION public.create_payment_schedule(
  p_enrollment_id UUID,
  p_student_id UUID,
  p_total_amount NUMERIC,
  p_registration_amount NUMERIC DEFAULT NULL,
  p_due_days_1 INTEGER DEFAULT 15,
  p_due_days_2 INTEGER DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_amount NUMERIC;
  v_balance_amount NUMERIC;
  v_balance_per_installment NUMERIC;
BEGIN
  -- Default registration to 40% if not specified
  v_reg_amount := COALESCE(p_registration_amount, p_total_amount * 0.4);
  v_balance_amount := p_total_amount - v_reg_amount;
  v_balance_per_installment := v_balance_amount / 2;
  
  -- Insert registration payment
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status)
  VALUES (p_enrollment_id, p_student_id, 'registration', v_reg_amount, CURRENT_DATE, 'pending');
  
  -- Insert balance 1
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status)
  VALUES (p_enrollment_id, p_student_id, 'balance_1', v_balance_per_installment, CURRENT_DATE + p_due_days_1, 'pending');
  
  -- Insert balance 2
  INSERT INTO payment_schedules (enrollment_id, student_id, payment_stage, amount, due_date, status)
  VALUES (p_enrollment_id, p_student_id, 'balance_2', v_balance_per_installment, CURRENT_DATE + p_due_days_2, 'pending');
END;
$$;

-- 6. Function to mark recipe as complete (for chef/admin only)
CREATE OR REPLACE FUNCTION public.mark_recipe_complete_by_chef(
  p_student_id UUID,
  p_recipe_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only chef or admin can call this
  IF NOT (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only chefs and admins can mark recipes as complete';
  END IF;
  
  -- Update student recipe progress
  UPDATE student_recipe_progress
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE student_id = p_student_id AND recipe_id = p_recipe_id;
  
  IF NOT FOUND THEN
    INSERT INTO student_recipe_progress (student_id, recipe_id, status, completed_at)
    VALUES (p_student_id, p_recipe_id, 'completed', now());
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 7. Add RLS policies for inventory_manager role
CREATE POLICY "Inventory managers can view inventory"
  ON public.inventory FOR SELECT
  USING (has_role(auth.uid(), 'inventory_manager'::app_role));

CREATE POLICY "Inventory managers can update inventory"
  ON public.inventory FOR UPDATE
  USING (has_role(auth.uid(), 'inventory_manager'::app_role));

CREATE POLICY "Inventory managers can manage inventory usage"
  ON public.inventory_usage FOR ALL
  USING (has_role(auth.uid(), 'inventory_manager'::app_role));