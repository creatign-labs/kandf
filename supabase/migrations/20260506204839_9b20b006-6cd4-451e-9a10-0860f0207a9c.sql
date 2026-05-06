-- 1) Set explicit search_path on the helper that lacked it
ALTER FUNCTION public.date_matches_batch_days(date, text) SET search_path = public;

-- 2) Revoke broad EXECUTE on SECURITY DEFINER functions and grant only to the
--    appropriate roles. Trigger-only functions get no grants (triggers run
--    independently of EXECUTE privileges).

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Grant EXECUTE to authenticated for client-callable RPCs
GRANT EXECUTE ON FUNCTION public.book_recipe_slot(uuid, uuid, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_recipe_slot_safe(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_recipe_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_booking_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_login_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_certificate_eligibility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_recipe_slots(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_incomplete_recipe(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_vendor_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_resume_with_audit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_recipe_complete_by_chef(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_advance_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_batch_completion(date, text, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_move_student_batch(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_student_from_batch(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_inventory_checklist(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_inventory_requirements(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_certificate_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_student_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_random_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_schedule(uuid, uuid, numeric, numeric, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_batch_seats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_application_to_vendor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_deduct_inventory(uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.date_matches_batch_days(date, text) TO authenticated;

-- check_lead_rate_limit is invoked by an RLS policy on the public lead form.
-- The WITH CHECK clause runs as the inserting role (anon for public submissions),
-- so anon must retain EXECUTE here.
GRANT EXECUTE ON FUNCTION public.check_lead_rate_limit(text) TO anon, authenticated;