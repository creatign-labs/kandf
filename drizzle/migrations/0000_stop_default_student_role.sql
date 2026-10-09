CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name',''), COALESCE(NEW.raw_user_meta_data->>'last_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''), NEW.email);
  -- Only student accounts get the student role; staff/vendor roles are assigned by their own flows.
  IF COALESCE(NEW.raw_user_meta_data->>'role','student') = 'student'
     AND COALESCE(NEW.raw_user_meta_data->>'account_type','') <> 'vendor' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DELETE FROM public.user_roles ur WHERE ur.role = 'student'
  AND EXISTS (SELECT 1 FROM public.user_roles o WHERE o.user_id = ur.user_id AND o.role IN ('admin','super_admin','chef','vendor','inventory_manager'));