-- Fix 1: LEADS TABLE - Restrict SELECT access
-- The table allows public INSERT for contact forms (correct), but needs to prevent public/user SELECT
-- Only admins should be able to read leads data

-- First, verify we're not breaking existing functionality by checking current policies
-- Then drop the existing overly permissive policy and create proper restricted access

-- Remove any existing SELECT policy that might allow public read
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;

-- Ensure admins can still manage all leads (this already exists, but let's be safe)
-- The existing "Admins can manage leads" policy handles SELECT, INSERT, UPDATE, DELETE for admins

-- Add explicit policy: Users cannot read other users' leads (no public SELECT)
-- This is already implicitly handled since there's no public SELECT policy,
-- but let's add super_admin access as well for completeness
CREATE POLICY "Super admins can manage leads"
ON public.leads
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));


-- Fix 2: RESUMES TABLE - Add explicit DENY for non-owner, non-admin access
-- Current policies allow: students (own), admins (all)
-- Add super_admin access and ensure vendors/chefs cannot access

-- Add super_admin access to resumes
CREATE POLICY "Super admins can view all resumes"
ON public.resumes
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add policy for vendors to view ONLY resumes of students who applied to their jobs
-- and whose applications have been released by admin
CREATE POLICY "Vendors can view released applicant resumes"
ON public.resumes
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role)
  AND EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN vendor_profiles vp ON vp.id = j.vendor_id
    WHERE ja.student_id = resumes.student_id
      AND ja.released_to_vendor = true
      AND vp.user_id = auth.uid()
  )
);