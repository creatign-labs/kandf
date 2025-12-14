
-- First rename student_code back to student_id (this is the user reference)
ALTER TABLE public.enrollments RENAME COLUMN student_code TO student_id;

-- Drop the user_id column we added if it exists
ALTER TABLE public.enrollments DROP COLUMN IF EXISTS user_id;

-- Add new student_code column for the custom student ID (TEXT type)
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS student_code TEXT;

-- Update trigger function to use correct column names
CREATE OR REPLACE FUNCTION public.trigger_auto_generate_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when progress becomes 100
  IF NEW.progress = 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
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
