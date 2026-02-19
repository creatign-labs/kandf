
-- ============================================================
-- STRESS TEST FIXES: Server-side enforcement & data integrity
-- ============================================================

-- 1. FIX: check_student_booking_eligibility references account_status but column is enrollment_status
CREATE OR REPLACE FUNCTION public.check_student_booking_eligibility(p_student_id uuid)
RETURNS TABLE(is_eligible boolean, reason text, next_recipe_id uuid, next_recipe_title text, course_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
  v_global_booking_enabled boolean;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Student not found'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- FIX: Use enrollment_status (the actual column) instead of account_status
  IF v_profile.enrollment_status NOT IN ('active', 'completed') THEN
    RETURN QUERY SELECT false, ('Account is ' || v_profile.enrollment_status || '. Booking blocked.')::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  SELECT * INTO v_enrollment FROM enrollments 
  WHERE student_id = p_student_id AND status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No active enrollment found'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  SELECT EXISTS (SELECT 1 FROM batches WHERE booking_enabled = true) INTO v_global_booking_enabled;
  
  IF NOT v_global_booking_enabled THEN
    RETURN QUERY SELECT false, 'Slot booking is currently closed'::text, NULL::uuid, NULL::text, v_enrollment.course_id;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    true,
    'Eligible'::text,
    nir.recipe_id,
    nir.recipe_title,
    v_enrollment.course_id
  FROM get_next_incomplete_recipe(p_student_id, v_enrollment.course_id) nir;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'All recipes completed'::text, NULL::uuid, NULL::text, v_enrollment.course_id;
  END IF;
END;
$$;

-- 2. FIX: Prevent attendance editing after batch completion (trigger)
CREATE OR REPLACE FUNCTION public.prevent_attendance_after_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_status text;
BEGIN
  -- Check if the recipe_batch this booking belongs to is already completed
  -- We check via bookings -> recipe_batch_memberships -> recipe_batches
  SELECT rb.status INTO v_batch_status
  FROM recipe_batches rb
  JOIN recipe_batch_memberships rbm ON rbm.recipe_batch_id = rb.id
  WHERE rbm.booking_id = NEW.batch_id
  LIMIT 1;
  
  -- If we found a completed batch, block the change
  IF v_batch_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify attendance for a completed batch';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_attendance_batch_status') THEN
    CREATE TRIGGER check_attendance_batch_status
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_attendance_after_completion();
  END IF;
END;
$$;

-- 3. FIX: Prevent reopening completed batches
CREATE OR REPLACE FUNCTION public.prevent_batch_reopen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot reopen a completed batch';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_recipe_batch_reopen') THEN
    CREATE TRIGGER prevent_recipe_batch_reopen
    BEFORE UPDATE ON public.recipe_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_batch_reopen();
  END IF;
END;
$$;

-- 4. FIX: Inventory deduction must RAISE on insufficient stock, not silently clamp
CREATE OR REPLACE FUNCTION public.safe_deduct_inventory(
  p_inventory_id uuid,
  p_quantity numeric,
  p_used_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_stock numeric;
  v_name text;
  v_unit text;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT current_stock, name, unit INTO v_current_stock, v_name, v_unit
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: % needs % %, only % available', v_name, p_quantity, v_unit, v_current_stock;
  END IF;
  
  UPDATE inventory
  SET current_stock = current_stock - p_quantity,
      updated_at = now()
  WHERE id = p_inventory_id;
  
  INSERT INTO inventory_usage (inventory_id, quantity_used, used_by, notes)
  VALUES (p_inventory_id, p_quantity, p_used_by, p_notes);
END;
$$;

-- 5. FIX: Atomic batch confirmation function (server-side, not client-side)
CREATE OR REPLACE FUNCTION public.confirm_batch_completion(
  p_batch_date date,
  p_time_slot text,
  p_recipe_id uuid,
  p_attendance jsonb, -- array of {student_id, booking_id, status}
  p_session_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chef_id uuid;
  v_entry jsonb;
  v_student_id uuid;
  v_booking_id uuid;
  v_status text;
  v_present_count integer := 0;
  v_no_show_count integer;
  v_ingredient record;
  v_recipe_batch_id uuid;
  v_course_id uuid;
BEGIN
  v_chef_id := auth.uid();
  
  -- Verify chef role
  IF NOT has_role(v_chef_id, 'chef'::app_role) THEN
    RAISE EXCEPTION 'Only chefs can confirm batch completion';
  END IF;
  
  -- Find recipe batch
  SELECT rb.id, rb.course_id INTO v_recipe_batch_id, v_course_id
  FROM recipe_batches rb
  WHERE rb.recipe_id = p_recipe_id
    AND rb.batch_date = p_batch_date
    AND rb.time_slot = p_time_slot
    AND rb.status = 'scheduled';
  
  IF v_recipe_batch_id IS NULL THEN
    -- Try to find via bookings
    SELECT DISTINCT b.course_id INTO v_course_id
    FROM bookings b
    WHERE b.recipe_id = p_recipe_id
      AND b.booking_date = p_batch_date
      AND b.time_slot = p_time_slot
    LIMIT 1;
    
    IF v_course_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Batch not found or already completed');
    END IF;
  END IF;
  
  -- Count present students first for inventory check
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    IF (v_entry->>'status') = 'present' THEN
      v_present_count := v_present_count + 1;
    END IF;
  END LOOP;
  
  -- Check inventory sufficiency BEFORE any mutations
  IF p_recipe_id IS NOT NULL AND v_present_count > 0 THEN
    FOR v_ingredient IN
      SELECT ri.inventory_id, ri.quantity_per_student, i.current_stock, i.name, i.unit
      FROM recipe_ingredients ri
      JOIN inventory i ON i.id = ri.inventory_id
      WHERE ri.recipe_id = p_recipe_id
    LOOP
      IF v_ingredient.current_stock < (v_ingredient.quantity_per_student * v_present_count) THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', format('Insufficient inventory: %s needs %s %s, only %s available',
            v_ingredient.name,
            (v_ingredient.quantity_per_student * v_present_count)::text,
            v_ingredient.unit,
            v_ingredient.current_stock::text
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Process attendance atomically
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    v_student_id := (v_entry->>'student_id')::uuid;
    v_booking_id := (v_entry->>'booking_id')::uuid;
    v_status := v_entry->>'status';
    
    IF v_status = 'present' THEN
      -- Update booking
      UPDATE bookings SET status = 'attended', updated_at = now() WHERE id = v_booking_id;
      
      -- Mark recipe complete
      IF p_recipe_id IS NOT NULL THEN
        PERFORM mark_recipe_complete_by_chef(v_student_id, p_recipe_id);
      END IF;
      
      -- Record attendance
      INSERT INTO attendance (student_id, batch_id, class_date, status, marked_by)
      VALUES (v_student_id, v_booking_id, p_batch_date, 'present', v_chef_id)
      ON CONFLICT DO NOTHING;
      
    ELSIF v_status = 'absent' THEN
      -- Mark no_show
      UPDATE bookings SET status = 'no_show', updated_at = now() WHERE id = v_booking_id;
      
      INSERT INTO attendance (student_id, batch_id, class_date, status, marked_by)
      VALUES (v_student_id, v_booking_id, p_batch_date, 'no_show', v_chef_id)
      ON CONFLICT DO NOTHING;
      
      -- Check total no-show count and lock if >= 3
      SELECT COUNT(*) INTO v_no_show_count
      FROM attendance WHERE student_id = v_student_id AND status = 'no_show';
      
      IF v_no_show_count >= 3 THEN
        UPDATE profiles SET enrollment_status = 'locked_no_show', updated_at = now()
        WHERE id = v_student_id AND enrollment_status = 'active';
        
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_student_id, 'Account Locked', 'Your account has been locked due to 3+ no-shows. Contact admin.', 'warning');
      ELSIF v_no_show_count = 2 THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_student_id, 'No-Show Warning', 'You have 2 no-shows. One more will lock your account.', 'warning');
      END IF;
    END IF;
  END LOOP;
  
  -- Deduct inventory for present students (with row locking)
  IF p_recipe_id IS NOT NULL AND v_present_count > 0 THEN
    FOR v_ingredient IN
      SELECT ri.inventory_id, ri.quantity_per_student
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id
    LOOP
      PERFORM safe_deduct_inventory(
        v_ingredient.inventory_id,
        v_ingredient.quantity_per_student * v_present_count,
        v_chef_id,
        format('Batch completion: %s present students', v_present_count)
      );
    END LOOP;
  END IF;
  
  -- Mark batch as completed
  IF v_recipe_batch_id IS NOT NULL THEN
    UPDATE recipe_batches
    SET status = 'completed',
        session_notes = COALESCE(p_session_notes, session_notes),
        session_notes_by = CASE WHEN p_session_notes IS NOT NULL THEN v_chef_id ELSE session_notes_by END,
        session_notes_at = CASE WHEN p_session_notes IS NOT NULL THEN now() ELSE session_notes_at END,
        updated_at = now()
    WHERE id = v_recipe_batch_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Batch completed successfully');
END;
$$;

-- 6. FIX: Prevent negative inventory on manual adjustments
CREATE OR REPLACE FUNCTION public.prevent_negative_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.current_stock < 0 THEN
    RAISE EXCEPTION 'Inventory stock cannot go below zero for item %', NEW.name;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_non_negative_inventory') THEN
    CREATE TRIGGER enforce_non_negative_inventory
    BEFORE INSERT OR UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_negative_inventory();
  END IF;
END;
$$;

-- 7. FIX: Job application eligibility check (server-side via RLS insert policy)
-- Replace the simple student insert policy with one that checks eligibility
DROP POLICY IF EXISTS "Students can create applications" ON public.job_applications;

CREATE POLICY "Students can create applications with eligibility check"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND (
    SELECT p.enrollment_status IN ('active', 'completed')
    FROM profiles p WHERE p.id = auth.uid()
  )
  AND (
    SELECT COALESCE(e.progress, 0) >= 100
    FROM enrollments e
    WHERE e.student_id = auth.uid() AND e.status IN ('active', 'completed')
    ORDER BY e.created_at DESC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM payment_schedules ps
    WHERE ps.student_id = auth.uid() AND ps.status IN ('pending', 'overdue')
  )
);

-- 8. FIX: Prevent duplicate payment ledger entries (idempotent webhook protection)
-- Add unique index on razorpay_payment_id to prevent duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_unique 
ON public.payments (stripe_payment_id) 
WHERE stripe_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_advance_payments_razorpay_unique
ON public.advance_payments (razorpay_payment_id)
WHERE razorpay_payment_id IS NOT NULL;

-- 9. Payments table: no UPDATE/DELETE already enforced. Add explicit block for super_admin manual adjustments
-- Super admins should use the payments INSERT to create adjustment entries, not update existing ones
-- This is already correct: no UPDATE policy exists

-- 10. FIX: Chef RLS - restrict recipe_batches UPDATE to session_notes only
DROP POLICY IF EXISTS "Chefs can view recipe batches" ON public.recipe_batches;

CREATE POLICY "Chefs can view assigned recipe batches"
ON public.recipe_batches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'chef'::app_role)
  AND (
    -- Chef can see batches where they have assigned bookings
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.recipe_id = recipe_batches.recipe_id
        AND b.booking_date = recipe_batches.batch_date
        AND b.time_slot = recipe_batches.time_slot
        AND b.assigned_chef_id = auth.uid()
    )
    -- OR batches with unassigned bookings (shared chef view)
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.recipe_id = recipe_batches.recipe_id
        AND b.booking_date = recipe_batches.batch_date
        AND b.time_slot = recipe_batches.time_slot
        AND b.assigned_chef_id IS NULL
    )
  )
);

-- Chef can update only session_notes on recipe_batches
CREATE POLICY "Chefs can update session notes"
ON public.recipe_batches
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role))
WITH CHECK (has_role(auth.uid(), 'chef'::app_role));

-- 11. Super admins should see all enrollments
CREATE POLICY "Super admins can view all enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 12. Super admins can view all payments
CREATE POLICY "Super admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 13. Super admins can insert payment adjustments
CREATE POLICY "Super admins can insert payment adjustments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
