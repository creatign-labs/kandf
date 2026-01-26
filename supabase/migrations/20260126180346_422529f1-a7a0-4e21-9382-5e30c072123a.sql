-- Update the generate_student_id function to use new format: YYYY-INITIALS-NNN
CREATE OR REPLACE FUNCTION public.generate_student_id(p_course_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_course_title TEXT;
  v_initials TEXT;
  v_year TEXT;
  v_count INTEGER;
  v_word TEXT;
  v_words TEXT[];
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get course title
  SELECT title INTO v_course_title FROM courses WHERE id = p_course_id;
  
  IF v_course_title IS NULL THEN
    v_initials := 'XX';
  ELSE
    -- Generate initials from course title words
    -- Split title into words and take first letter of each word
    v_initials := '';
    v_words := string_to_array(v_course_title, ' ');
    
    FOREACH v_word IN ARRAY v_words
    LOOP
      -- Only include words that start with a letter (skip numbers, special chars)
      IF v_word ~ '^[A-Za-z]' THEN
        v_initials := v_initials || UPPER(LEFT(v_word, 1));
      END IF;
    END LOOP;
    
    -- Fallback if no valid initials generated
    IF v_initials = '' THEN
      v_initials := 'XX';
    END IF;
  END IF;
  
  -- Count existing enrollments for this course this year
  SELECT COUNT(*) + 1 INTO v_count 
  FROM enrollments 
  WHERE course_id = p_course_id 
  AND student_code IS NOT NULL
  AND student_code LIKE v_year || '-%';
  
  -- Return format: YYYY-INITIALS-NNN
  RETURN v_year || '-' || v_initials || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$function$;