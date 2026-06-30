ALTER TABLE public.vendor_profiles
ADD COLUMN IF NOT EXISTS gst_number text;

ALTER TABLE public.vendor_profiles
DROP CONSTRAINT IF EXISTS vendor_profiles_gst_number_format;

ALTER TABLE public.vendor_profiles
ADD CONSTRAINT vendor_profiles_gst_number_format
CHECK (
  gst_number IS NULL
  OR gst_number = ''
  OR gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
);

COMMENT ON COLUMN public.vendor_profiles.gst_number IS 'Indian GSTIN for registered vendor companies.';