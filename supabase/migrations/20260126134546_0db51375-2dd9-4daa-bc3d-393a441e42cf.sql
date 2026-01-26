-- Create vendor_access_approvals table similar to student_access_approvals
CREATE TABLE public.vendor_access_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  credentials_sent_at TIMESTAMPTZ,
  generated_password TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_access_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_access_approvals
CREATE POLICY "Admins can view vendor approvals"
ON public.vendor_access_approvals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage vendor approvals"
ON public.vendor_access_approvals
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Vendors can view own approval"
ON public.vendor_access_approvals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Vendors can insert own approval"
ON public.vendor_access_approvals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add approval_status to vendor_profiles to track pending/approved status
ALTER TABLE public.vendor_profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';

-- Update existing vendor profiles to be approved (backward compatibility)
UPDATE public.vendor_profiles 
SET approval_status = 'approved' 
WHERE approval_status = 'pending';

-- Create function to generate vendor ID
CREATE OR REPLACE FUNCTION public.generate_vendor_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Count existing vendors this year
  SELECT COUNT(*) + 1 INTO v_count 
  FROM vendor_profiles 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  RETURN 'VND-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Add vendor_code to vendor_profiles
ALTER TABLE public.vendor_profiles
ADD COLUMN IF NOT EXISTS vendor_code TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_access_approvals_status ON public.vendor_access_approvals(status);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_approval_status ON public.vendor_profiles(approval_status);