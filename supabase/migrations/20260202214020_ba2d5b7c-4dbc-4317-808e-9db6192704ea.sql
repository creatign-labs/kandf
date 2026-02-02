-- Tighten overly permissive INSERT policy (linter 0024)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'Anyone can create leads'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can create leads" ON public.leads';
  END IF;
END $$;

CREATE POLICY "Anyone can create leads"
ON public.leads
FOR INSERT
TO public
WITH CHECK (
  COALESCE(name, '') <> ''
  AND COALESCE(email, '') <> ''
);
