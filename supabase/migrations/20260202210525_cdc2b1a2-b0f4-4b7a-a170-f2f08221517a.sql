-- Step 1: Drop the trigger first (it references the old function)
DROP TRIGGER IF EXISTS trigger_log_account_status_change ON public.profiles;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS public.log_account_status_change();

-- Step 3: Drop the existing check constraint on account_status
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_account_status_check;

-- Step 4: Rename account_status column to enrollment_status in profiles table
ALTER TABLE public.profiles 
RENAME COLUMN account_status TO enrollment_status;

-- Step 5: Update existing status values to new enrollment status values
UPDATE public.profiles 
SET enrollment_status = 'enrolled' 
WHERE enrollment_status IN ('pending', 'advance_paid');

UPDATE public.profiles 
SET enrollment_status = 'cancelled' 
WHERE enrollment_status = 'rejected';

-- Step 6: Add new check constraint with updated valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_enrollment_status_check 
CHECK (enrollment_status IN ('enrolled', 'active', 'on_hold', 'completed', 'cancelled'));

-- Step 7: Update the default value for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN enrollment_status SET DEFAULT 'enrolled';

-- Step 8: Rename account_status_logs table to enrollment_status_logs
ALTER TABLE public.account_status_logs 
RENAME TO enrollment_status_logs;

-- Step 9: Rename columns in enrollment_status_logs table
ALTER TABLE public.enrollment_status_logs 
RENAME COLUMN old_status TO old_enrollment_status;

ALTER TABLE public.enrollment_status_logs 
RENAME COLUMN new_status TO new_enrollment_status;

-- Step 10: Create new trigger function for enrollment_status changes
CREATE OR REPLACE FUNCTION public.log_enrollment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status THEN
    INSERT INTO public.enrollment_status_logs (
      student_id,
      old_enrollment_status,
      new_enrollment_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.enrollment_status,
      NEW.enrollment_status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 11: Create the trigger on profiles table
CREATE TRIGGER trigger_log_enrollment_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_enrollment_status_change();

-- Step 12: Add a comment documenting the valid enrollment status values
COMMENT ON COLUMN public.profiles.enrollment_status IS 'Valid values: enrolled, active, on_hold, completed, cancelled';