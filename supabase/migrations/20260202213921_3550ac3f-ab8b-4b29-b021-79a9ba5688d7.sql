-- Fix enrollment_status_logs failing for service-role / system updates
ALTER TABLE public.enrollment_status_logs
  ALTER COLUMN changed_by DROP NOT NULL;

COMMENT ON COLUMN public.enrollment_status_logs.changed_by IS 'User who changed status; may be NULL for system/service updates (e.g., backend automation)';
