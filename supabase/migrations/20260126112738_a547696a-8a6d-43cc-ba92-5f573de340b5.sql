-- Update the log_account_status_change trigger to handle cases where auth.uid() is null
CREATE OR REPLACE FUNCTION public.log_account_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO account_status_logs (student_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.account_status, NEW.account_status, COALESCE(auth.uid(), NEW.id));
  END IF;
  RETURN NEW;
END;
$function$;