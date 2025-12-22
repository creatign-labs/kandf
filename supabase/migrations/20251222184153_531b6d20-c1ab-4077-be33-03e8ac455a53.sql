-- CHANGE SET 2: Create student onboarding questionnaire table
CREATE TABLE public.student_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  preferred_duration TEXT NOT NULL,
  recipe_interests TEXT[] NOT NULL DEFAULT '{}',
  skill_level TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own onboarding"
ON public.student_onboarding FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own onboarding"
ON public.student_onboarding FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all onboarding"
ON public.student_onboarding FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create advance payments table for tracking ₹2000 advances
CREATE TABLE public.advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  amount NUMERIC NOT NULL DEFAULT 2000,
  payment_method TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.advance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own advance payments"
ON public.advance_payments FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own advance payments"
ON public.advance_payments FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Super admins and admins can view all advance payments"
ON public.advance_payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update advance payments"
ON public.advance_payments FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create student access approvals table
CREATE TABLE public.student_access_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  advance_payment_id UUID REFERENCES public.advance_payments(id),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  generated_password TEXT,
  credentials_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_access_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own access approval"
ON public.student_access_approvals FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Super admins can manage access approvals"
ON public.student_access_approvals FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view access approvals"
ON public.student_access_approvals FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create recipe_ingredients junction table for per-student quantities
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity_per_student NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, inventory_id)
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipe ingredients"
ON public.recipe_ingredients FOR SELECT
USING (true);

CREATE POLICY "Admins and super admins can manage recipe ingredients"
ON public.recipe_ingredients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create inventory checklists table
CREATE TABLE public.inventory_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_date DATE NOT NULL,
  generated_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  purchased_by UUID,
  purchased_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_date)
);

ALTER TABLE public.inventory_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins super admins chefs can view checklists"
ON public.inventory_checklists FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'chef'::app_role));

CREATE POLICY "Admins and super admins can create checklists"
ON public.inventory_checklists FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update checklists"
ON public.inventory_checklists FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update own checklists"
ON public.inventory_checklists FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND status != 'approved');

-- Create checklist items table
CREATE TABLE public.inventory_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.inventory_checklists(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  required_quantity NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  to_purchase NUMERIC NOT NULL DEFAULT 0,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins super admins chefs can view checklist items"
ON public.inventory_checklist_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'chef'::app_role));

CREATE POLICY "Admins and super admins can manage checklist items"
ON public.inventory_checklist_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create is_super_admin helper function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  )
$$;

-- Create function to generate random password
CREATE OR REPLACE FUNCTION public.generate_random_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;