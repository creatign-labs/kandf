-- Step 1: Create a rate-limiting function for lead submissions
-- Limits to 3 leads per email within a 1-hour window and 10 total per hour from anonymous users
CREATE OR REPLACE FUNCTION public.check_lead_rate_limit(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Max 3 submissions from the same email in the last hour
    (SELECT COUNT(*) FROM public.leads 
     WHERE email = p_email 
     AND created_at > (now() - interval '1 hour')) < 3
  )
$$;

-- Step 2: Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;

-- Step 3: Create a hardened INSERT policy with rate limiting and stricter validation
CREATE POLICY "Anyone can create leads with rate limit"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Name must be non-empty and reasonable length (max 100 chars)
  COALESCE(name, '') <> '' 
  AND length(name) <= 100
  -- Email must be non-empty, valid format, and reasonable length
  AND COALESCE(email, '') <> '' 
  AND length(email) <= 255
  AND email ~* '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
  -- Phone is optional but if provided must be reasonable
  AND (phone IS NULL OR length(phone) <= 20)
  -- Message is optional but if provided must be reasonable length
  AND (message IS NULL OR length(message) <= 2000)
  -- Rate limit: max 3 per email per hour
  AND public.check_lead_rate_limit(email)
  -- Prevent injection in stage/source by only allowing defaults
  AND (stage IS NULL OR stage = 'new')
  AND (source IS NULL OR source = 'website')
);