
-- Rename student_id column to custom_student_id to avoid confusion
ALTER TABLE public.enrollments RENAME COLUMN student_id TO custom_student_id;
