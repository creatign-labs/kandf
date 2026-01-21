-- 1. Create payment_schedules table for multi-stage payments
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  payment_stage TEXT NOT NULL CHECK (payment_stage IN ('registration', 'balance_1', 'balance_2')),
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, payment_stage)
);

-- Enable RLS on payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_schedules
CREATE POLICY "Students can view own payment schedules"
  ON public.payment_schedules FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all payment schedules"
  ON public.payment_schedules FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage payment schedules"
  ON public.payment_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Add document upload columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS address_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS marksheet_url TEXT,
  ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE;

-- 3. Add flags to enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS is_advance_payment BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS attendance_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_classes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attended_classes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;

-- 4. Allow admins to update enrollments
CREATE POLICY "Admins can update enrollments"
  ON public.enrollments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Allow admins to insert enrollments (for admin-assisted enrollment)
CREATE POLICY "Admins can create enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));