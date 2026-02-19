
-- Add batch_id and chef_id to feedback table for linking feedback to specific batches
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id);
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS chef_id uuid;

-- Add unique constraint: one feedback per batch per student
ALTER TABLE public.feedback ADD CONSTRAINT feedback_student_batch_unique UNIQUE (student_id, batch_id);
