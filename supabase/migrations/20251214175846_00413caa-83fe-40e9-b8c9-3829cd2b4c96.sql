
-- Revert the rename and add a new column instead
ALTER TABLE public.enrollments RENAME COLUMN custom_student_id TO student_code;
