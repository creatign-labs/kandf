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
  v_next_recipe_id uuid;
  v_next_recipe_title text;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Student not found'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

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

  -- Try to fetch a next incomplete recipe (purely informational; do NOT block booking)
  BEGIN
    SELECT nir.recipe_id, nir.recipe_title
      INTO v_next_recipe_id, v_next_recipe_title
    FROM get_next_incomplete_recipe(p_student_id, v_enrollment.course_id) nir
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_next_recipe_id := NULL;
    v_next_recipe_title := NULL;
  END;

  -- Booking is course-level / generic. Always eligible if account + enrollment + global toggle pass.
  RETURN QUERY SELECT true, 'Eligible'::text, v_next_recipe_id, v_next_recipe_title, v_enrollment.course_id;
END;
$$;