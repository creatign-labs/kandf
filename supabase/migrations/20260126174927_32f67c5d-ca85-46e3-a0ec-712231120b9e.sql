-- Create table for add-on purchases
CREATE TABLE public.addon_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  addon_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, addon_type)
);

-- Enable RLS
ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;

-- Students can view their own purchases
CREATE POLICY "Students can view own addon purchases"
ON public.addon_purchases FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert their own purchases
CREATE POLICY "Students can insert own addon purchases"
ON public.addon_purchases FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can update their own purchases
CREATE POLICY "Students can update own addon purchases"
ON public.addon_purchases FOR UPDATE
USING (auth.uid() = student_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all addon purchases"
ON public.addon_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));