
-- Batches: add days_of_week to scope booking by day
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS days_of_week text[] NOT NULL DEFAULT '{}'::text[];

-- Profiles: extended personal details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_joining date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_other text;

-- Update booking RPC to enforce batch-level days_of_week (strict).
-- We re-use the existing date_matches_course_days helper which accepts text[].
CREATE OR REPLACE FUNCTION public.book_recipe_slot(
  p_student_id uuid,
  p_course_id uuid,
  p_recipe_id uuid,
  p_batch_date date,
  p_time_slot text
)
RETURNS TABLE(success boolean, message text, recipe_batch_id uuid, booking_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course record;
  v_batch record;
  v_count int;
  v_booking_id uuid;
  v_recipe_batch_id uuid := NULL;
  v_day_name text;
BEGIN
  -- Lock the student row context lightly
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Course not found', NULL::uuid, NULL::uuid; RETURN;
  END IF;

  -- Course-level day check (if set)
  IF v_course.days_of_week IS NOT NULL
     AND array_length(v_course.days_of_week, 1) IS NOT NULL
     AND NOT public.date_matches_course_days(p_batch_date, v_course.days_of_week) THEN
    RETURN QUERY SELECT false, 'This course does not run on the selected day.', NULL::uuid, NULL::uuid; RETURN;
  END IF;

  -- Find a matching batch for this course/time_slot that matches the date strictly
  SELECT b.* INTO v_batch
  FROM public.batches b
  WHERE b.course_id = p_course_id
    AND b.time_slot = p_time_slot
    AND COALESCE(b.booking_enabled, true) = true
    AND (b.start_date IS NULL OR p_batch_date >= b.start_date)
    AND (b.end_date IS NULL OR p_batch_date <= b.end_date)
    AND (
      b.days_of_week IS NULL
      OR array_length(b.days_of_week, 1) IS NULL
      OR public.date_matches_course_days(p_batch_date, b.days_of_week)
    )
  ORDER BY b.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No batch available for the selected date/time.', NULL::uuid, NULL::uuid; RETURN;
  END IF;

  -- Capacity check (sum of confirmed bookings for this batch's date+time across this course)
  SELECT COUNT(*) INTO v_count
  FROM public.bookings
  WHERE course_id = p_course_id
    AND booking_date = p_batch_date
    AND time_slot = p_time_slot
    AND status = 'confirmed';

  IF v_count >= v_batch.total_seats THEN
    RETURN QUERY SELECT false, 'All slots are booked for this date. Please contact admin.', NULL::uuid, NULL::uuid; RETURN;
  END IF;

  -- Prevent duplicate booking by same student same date+time
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE student_id = p_student_id
      AND booking_date = p_batch_date
      AND time_slot = p_time_slot
      AND status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'You already have a booking for this date and time.', NULL::uuid, NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.bookings (student_id, course_id, booking_date, time_slot, status, recipe_id)
  VALUES (p_student_id, p_course_id, p_batch_date, p_time_slot, 'confirmed', p_recipe_id)
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT true, 'Booked', v_recipe_batch_id, v_booking_id;
END;
$$;
