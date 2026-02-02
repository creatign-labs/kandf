-- Step 3: Add visiting discount columns to enrollments
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS visiting_discount_type TEXT CHECK (visiting_discount_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS visiting_discount_value NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.enrollments.visiting_discount_type IS 'Type of visiting discount: fixed (₹) or percentage (%)';
COMMENT ON COLUMN public.enrollments.visiting_discount_value IS 'Discount value applied during enrollment';