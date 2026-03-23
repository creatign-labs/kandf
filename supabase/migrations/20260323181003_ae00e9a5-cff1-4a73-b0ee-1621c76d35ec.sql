CREATE OR REPLACE FUNCTION public.book_recipe_slot(p_student_id uuid, p_course_id uuid, p_recipe_id uuid, p_batch_date date, p_time_slot text)
 RETURNS TABLE(success boolean, message text, recipe_batch_id uuid, booking_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id uuid;
  v_booking_id uuid;
  v_capacity integer;
  v_current_count integer;
  v_effective_recipe_id uuid;
  v_profile profiles%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
BEGIN
  -- Basic eligibility: check profile status and active enrollment
  SELECT * INTO v_profile FROM profiles WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Student not found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF v_profile.enrollment_status NOT IN ('active', 'completed') THEN
    RETURN QUERY SELECT false, ('Account is ' || v_profile.enrollment_status || '. Booking blocked.')::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_enrollment FROM enrollments 
  WHERE student_id = p_student_id AND status = 'active' LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No active enrollment found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  -- Check that at least one batch has booking enabled
  IF NOT EXISTS (SELECT 1 FROM batches WHERE booking_enabled = true) THEN
    RETURN QUERY SELECT false, 'Slot booking is currently closed'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  -- Use provided recipe or leave NULL (admin assigns later)
  v_effective_recipe_id := p_recipe_id;

  -- Check if student already has an active booking for the same date and time slot
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.student_id = p_student_id 
      AND b.booking_date = p_batch_date
      AND b.time_slot = p_time_slot
      AND b.status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'Already have a booking for this date and time slot'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  -- Check date is in future
  IF p_batch_date <= CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Booking date must be at least one day in advance'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  -- Create booking record
  INSERT INTO bookings (student_id, course_id, booking_date, time_slot, recipe_id, status)
  VALUES (p_student_id, p_course_id, p_batch_date, p_time_slot, v_effective_recipe_id, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- If we have an effective recipe, handle recipe batch membership
  IF v_effective_recipe_id IS NOT NULL THEN
    SELECT rb.id, rb.capacity INTO v_batch_id, v_capacity
    FROM recipe_batches rb
    WHERE rb.course_id = p_course_id
      AND rb.recipe_id = v_effective_recipe_id
      AND rb.time_slot = p_time_slot
      AND rb.batch_date = p_batch_date;

    IF v_batch_id IS NULL THEN
      SELECT b.total_seats INTO v_capacity
      FROM batches b
      WHERE b.course_id = p_course_id
        AND b.time_slot = p_time_slot
        AND b.booking_enabled = true
      LIMIT 1;

      IF v_capacity IS NULL THEN
        v_capacity := 10;
      END IF;

      INSERT INTO recipe_batches (course_id, recipe_id, time_slot, batch_date, capacity)
      VALUES (p_course_id, v_effective_recipe_id, p_time_slot, p_batch_date, v_capacity)
      RETURNING id INTO v_batch_id;
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM recipe_batch_memberships rbm
    WHERE rbm.recipe_batch_id = v_batch_id;

    IF v_current_count >= v_capacity THEN
      DELETE FROM bookings WHERE id = v_booking_id;
      RETURN QUERY SELECT false, 'Batch is full'::text, NULL::uuid, NULL::uuid;
      RETURN;
    END IF;

    INSERT INTO recipe_batch_memberships (recipe_batch_id, student_id, booking_id, is_manual_assignment)
    VALUES (v_batch_id, p_student_id, v_booking_id, false);
  END IF;

  RETURN QUERY SELECT true, 'Booking confirmed'::text, v_batch_id, v_booking_id;
END;
$function$;