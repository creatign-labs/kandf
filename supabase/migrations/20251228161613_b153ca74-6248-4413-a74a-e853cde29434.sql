-- Function to check if a student can login
-- Returns NULL if OK, or an error message if login should be disabled
CREATE OR REPLACE FUNCTION public.check_student_login_eligibility(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_no_show_count INTEGER;
  v_enrollment RECORD;
  v_course_duration_months INTEGER;
  v_enrollment_end_date DATE;
BEGIN
  -- Check if user is a student
  IF NOT has_role(p_user_id, 'student'::app_role) THEN
    RETURN NULL; -- Not a student, allow login
  END IF;

  -- Count "no_show" attendance records for this student
  SELECT COUNT(*) INTO v_no_show_count
  FROM attendance
  WHERE student_id = p_user_id
    AND status = 'no_show';

  IF v_no_show_count >= 3 THEN
    RETURN 'Login Disabled. Contact Admin.';
  END IF;

  -- Check course validity for all active enrollments
  FOR v_enrollment IN
    SELECT e.enrollment_date, c.duration
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = p_user_id
      AND e.status = 'active'
  LOOP
    -- Parse duration (assuming format like "3 months", "6 weeks", etc.)
    v_course_duration_months := COALESCE(
      (regexp_match(v_enrollment.duration, '(\d+)'))[1]::INTEGER,
      3 -- default to 3 months if parsing fails
    );
    
    -- Calculate enrollment end date
    v_enrollment_end_date := v_enrollment.enrollment_date::DATE + (v_course_duration_months || ' months')::INTERVAL;
    
    -- If all enrollments are expired, disable login
    IF v_enrollment_end_date < CURRENT_DATE THEN
      -- Check if there's at least one non-expired enrollment
      IF NOT EXISTS (
        SELECT 1 FROM enrollments e2
        JOIN courses c2 ON c2.id = e2.course_id
        WHERE e2.student_id = p_user_id
          AND e2.status = 'active'
          AND (e2.enrollment_date::DATE + (
            COALESCE((regexp_match(c2.duration, '(\d+)'))[1]::INTEGER, 3) || ' months'
          )::INTERVAL) >= CURRENT_DATE
      ) THEN
        RETURN 'Login Disabled. Contact Admin.';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL; -- Allow login
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_student_login_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_login_eligibility(uuid) TO anon;