-- Remove the trigger that forces password change (it's no longer needed)
DROP TRIGGER IF EXISTS trigger_set_must_change_password ON public.profiles;

-- Update the function to do nothing (keep it for backwards compatibility but disable the behavior)
CREATE OR REPLACE FUNCTION public.set_student_must_change_password()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Password change is now OPTIONAL - do not force it
  -- The generated password from Super Admin is the FINAL valid password
  -- Student can optionally change it later via profile settings
  RETURN NEW;
END;
$function$;

-- Set must_change_password to false for all active students
UPDATE public.profiles 
SET must_change_password = false 
WHERE account_status = 'active' AND must_change_password = true;