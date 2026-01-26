-- Change payment_id column from UUID to TEXT to store Razorpay payment IDs
ALTER TABLE public.payment_schedules 
ALTER COLUMN payment_id TYPE TEXT;