
CREATE TABLE public.vendor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_profile_id UUID REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  gst_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.vendor_payments TO authenticated;
GRANT ALL ON public.vendor_payments TO service_role;

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own payments" ON public.vendor_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Vendors insert own payments" ON public.vendor_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all vendor payments" ON public.vendor_payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.set_vendor_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_vendor_payments_updated_at
  BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_vendor_payments_updated_at();

CREATE INDEX idx_vendor_payments_user ON public.vendor_payments(user_id);
CREATE INDEX idx_vendor_payments_order ON public.vendor_payments(razorpay_order_id);
