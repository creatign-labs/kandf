-- Add recipe_id to bookings table for recipe assignment by admin
ALTER TABLE public.bookings 
ADD COLUMN recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL;

-- Create an index for efficient grouping by recipe and date
CREATE INDEX idx_bookings_recipe_date ON public.bookings(recipe_id, booking_date);

-- Add RLS policy for admins to update bookings (for recipe assignment)
CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Chefs can view all bookings
CREATE POLICY "Chefs can view all bookings"
ON public.bookings
FOR SELECT
USING (has_role(auth.uid(), 'chef'::app_role));