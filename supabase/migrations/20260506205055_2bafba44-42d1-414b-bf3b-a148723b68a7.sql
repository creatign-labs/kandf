-- Schedule no-show consumer every 15 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('no-show-consumer-every-15-min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'no-show-consumer-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://txsbiergktqyhfyxoqwg.supabase.co/functions/v1/no-show-consumer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4c2JpZXJna3RxeWhmeXhvcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDk1NzksImV4cCI6MjA4MDgyNTU3OX0.552Qw4hcuTfTA5fDkrhUWuY4jDR1UxQKqSB6sGp3Y54'
    ),
    body := '{}'::jsonb
  );
  $$
);