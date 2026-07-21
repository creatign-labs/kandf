
CREATE TABLE public.staff_credentials (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_plain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_credentials TO authenticated;
GRANT ALL ON public.staff_credentials TO service_role;

ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view staff credentials"
ON public.staff_credentials
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- No INSERT/UPDATE/DELETE policies: writes happen through service_role in edge functions only.

CREATE TRIGGER update_staff_credentials_updated_at
BEFORE UPDATE ON public.staff_credentials
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
