
-- Email delivery log
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and super admins view email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Track which reminders have been sent for a booking to avoid duplicates
CREATE TABLE IF NOT EXISTS public.booking_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  reminder_type text NOT NULL, -- '24h' | '2h' | 'cutoff'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reminder_type)
);

ALTER TABLE public.booking_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view reminder log"
ON public.booking_reminders_sent FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Enable scheduling extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
