-- Fix the book_recipe_slot function - resolve ambiguous recipe_batch_id column reference
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
BEGIN
  -- Check eligibility first
  IF NOT EXISTS (
    SELECT 1 FROM check_student_booking_eligibility(p_student_id) elig
    WHERE elig.is_eligible = true AND elig.next_recipe_id = p_recipe_id
  ) THEN
    RETURN QUERY SELECT false, 'Not eligible to book this recipe'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if student already has a booking for this recipe
  IF EXISTS (
    SELECT 1 FROM recipe_batch_memberships rbm
    JOIN recipe_batches rb ON rb.id = rbm.recipe_batch_id
    WHERE rbm.student_id = p_student_id AND rb.recipe_id = p_recipe_id
  ) THEN
    RETURN QUERY SELECT false, 'Already booked for this recipe'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check date is in future
  IF p_batch_date <= CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Booking date must be at least one day in advance'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Find or create recipe batch
  SELECT rb.id, rb.capacity INTO v_batch_id, v_capacity
  FROM recipe_batches rb
  WHERE rb.course_id = p_course_id
    AND rb.recipe_id = p_recipe_id
    AND rb.time_slot = p_time_slot
    AND rb.batch_date = p_batch_date;
  
  IF v_batch_id IS NULL THEN
    -- Get capacity from regular batches
    SELECT b.total_seats INTO v_capacity
    FROM batches b
    WHERE b.course_id = p_course_id
      AND b.time_slot = p_time_slot
      AND b.booking_enabled = true
    LIMIT 1;
    
    IF v_capacity IS NULL THEN
      v_capacity := 10; -- Default capacity
    END IF;
    
    -- Create new recipe batch
    INSERT INTO recipe_batches (course_id, recipe_id, time_slot, batch_date, capacity)
    VALUES (p_course_id, p_recipe_id, p_time_slot, p_batch_date, v_capacity)
    RETURNING id INTO v_batch_id;
  END IF;
  
  -- Check capacity
  SELECT COUNT(*) INTO v_current_count
  FROM recipe_batch_memberships rbm
  WHERE rbm.recipe_batch_id = v_batch_id;
  
  IF v_current_count >= v_capacity THEN
    RETURN QUERY SELECT false, 'Batch is full'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Create booking record
  INSERT INTO bookings (student_id, course_id, booking_date, time_slot, recipe_id, status)
  VALUES (p_student_id, p_course_id, p_batch_date, p_time_slot, p_recipe_id, 'confirmed')
  RETURNING id INTO v_booking_id;
  
  -- Add student to recipe batch
  INSERT INTO recipe_batch_memberships (recipe_batch_id, student_id, booking_id, is_manual_assignment)
  VALUES (v_batch_id, p_student_id, v_booking_id, false);
  
  RETURN QUERY SELECT true, 'Booking confirmed'::text, v_batch_id, v_booking_id;
END;
$function$;