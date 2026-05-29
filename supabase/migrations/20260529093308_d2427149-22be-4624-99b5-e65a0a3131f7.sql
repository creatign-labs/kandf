
CREATE OR REPLACE FUNCTION public.enforce_enrollment_course_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    -- Allow super admins to override (manual corrections)
    IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RETURN NEW;
    END IF;
    -- Allow if enrollment is being cancelled (effectively voiding it)
    IF NEW.status = 'cancelled' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Enrollment course is locked once created and cannot be changed (enrollment %).', OLD.id
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_enrollment_course_immutable ON public.enrollments;
CREATE TRIGGER trg_enforce_enrollment_course_immutable
BEFORE UPDATE OF course_id ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_enrollment_course_immutable();
