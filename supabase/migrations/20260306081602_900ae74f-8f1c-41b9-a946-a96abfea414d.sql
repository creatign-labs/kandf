-- Task 1: Add payment reference number field to payment_schedules
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Task 6: Add table_number field to bookings for admin table assignment
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS table_number TEXT;