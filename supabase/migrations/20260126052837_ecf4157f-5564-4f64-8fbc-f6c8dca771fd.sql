-- Add 'vendor' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- Create vendor_profiles table for additional vendor-specific data
CREATE TABLE public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add vendor_id column to jobs table (nullable for backward compatibility, existing jobs are platform-owned)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE SET NULL;

-- Enable RLS on vendor_profiles
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_profiles
CREATE POLICY "Vendors can view own profile"
  ON public.vendor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can update own profile"
  ON public.vendor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can insert own profile"
  ON public.vendor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all vendor profiles"
  ON public.vendor_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage vendor profiles"
  ON public.vendor_profiles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Update jobs RLS to allow vendors to manage their own jobs
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;

CREATE POLICY "Admins can manage all jobs"
  ON public.jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Vendors can manage own jobs"
  ON public.jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = jobs.vendor_id
      AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = jobs.vendor_id
      AND vp.user_id = auth.uid()
    )
  );

-- Create a view for vendors to see application counts without student identity
CREATE VIEW public.job_application_counts
WITH (security_invoker=on) AS
SELECT 
  j.id as job_id,
  j.title,
  j.company,
  j.location,
  j.type,
  j.is_active,
  j.posted_at,
  j.vendor_id,
  COUNT(ja.id) as application_count,
  COUNT(CASE WHEN ja.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN ja.status = 'reviewed' THEN 1 END) as reviewed_count,
  COUNT(CASE WHEN ja.status = 'shortlisted' THEN 1 END) as shortlisted_count
FROM public.jobs j
LEFT JOIN public.job_applications ja ON j.id = ja.job_id
GROUP BY j.id, j.title, j.company, j.location, j.type, j.is_active, j.posted_at, j.vendor_id;

-- Update job_applications to add 'reviewed' and 'shortlisted' status support and add release tracking
ALTER TABLE public.job_applications 
  ADD COLUMN IF NOT EXISTS released_to_vendor BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_by UUID;

-- Update job_applications RLS - vendors can only see released applications
CREATE POLICY "Vendors can view released applications for their jobs"
  ON public.job_applications FOR SELECT
  USING (
    released_to_vendor = true
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.vendor_profiles vp ON vp.id = j.vendor_id
      WHERE j.id = job_applications.job_id
      AND vp.user_id = auth.uid()
    )
  );

-- Function to get vendor profile for current user
CREATE OR REPLACE FUNCTION public.get_current_vendor_profile()
RETURNS public.vendor_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.vendor_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Function to release application to vendor (admin/super_admin only)
CREATE OR REPLACE FUNCTION public.release_application_to_vendor(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin or super_admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can release applications to vendors';
  END IF;
  
  UPDATE public.job_applications
  SET released_to_vendor = true,
      released_at = now(),
      released_by = auth.uid(),
      status = 'reviewed',
      updated_at = now()
  WHERE id = p_application_id;
  
  RETURN FOUND;
END;
$$;

-- Trigger to update updated_at on vendor_profiles
CREATE TRIGGER update_vendor_profiles_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();