
-- Add assigned_chef_id column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS assigned_chef_id uuid REFERENCES profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_chef ON public.bookings(assigned_chef_id);
