
-- Table for lead payment plans (pre-enrollment payment setup)
CREATE TABLE public.lead_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  enrollment_fee NUMERIC NOT NULL DEFAULT 2000,
  discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL DEFAULT 3,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Table for individual installments within a lead payment plan
CREATE TABLE public.lead_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.lead_payment_plans(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Installment',
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  payment_link_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_installments ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins and super_admins can manage lead payment plans
CREATE POLICY "Admins can manage lead payment plans"
ON public.lead_payment_plans FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can manage lead installments"
ON public.lead_installments FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Public can read installments by ID (for payment link access)
CREATE POLICY "Public can view installments by id"
ON public.lead_installments FOR SELECT
USING (true);

-- Updated_at triggers
CREATE TRIGGER update_lead_payment_plans_updated_at
BEFORE UPDATE ON public.lead_payment_plans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_lead_installments_updated_at
BEFORE UPDATE ON public.lead_installments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
