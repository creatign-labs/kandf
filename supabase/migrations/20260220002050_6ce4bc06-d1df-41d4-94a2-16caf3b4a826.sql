-- Remove the dangerous student UPDATE policy on payment_schedules
-- Students should only have read-only (SELECT) access to their payment schedules
-- Updates should only come from admins, edge functions, or database triggers
DROP POLICY IF EXISTS "Students can update own payment schedules" ON public.payment_schedules;