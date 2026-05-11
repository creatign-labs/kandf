ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.batches ALTER COLUMN days DROP NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN course_id DROP NOT NULL;