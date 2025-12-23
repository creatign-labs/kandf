
-- 1. Add account_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending' 
CHECK (account_status IN ('pending', 'advance_paid', 'approved', 'active'));

-- 2. Create daily_inventory_requirements table
CREATE TABLE IF NOT EXISTS public.daily_inventory_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_date date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'purchased')),
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamp with time zone,
  purchased_by uuid,
  purchased_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create daily_inventory_requirement_items table
CREATE TABLE IF NOT EXISTS public.daily_inventory_requirement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.daily_inventory_requirements(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  required_quantity numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  to_purchase numeric NOT NULL DEFAULT 0,
  is_purchased boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, inventory_id)
);

-- 4. Create inventory_approvals log table for audit trail
CREATE TABLE IF NOT EXISTS public.inventory_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.daily_inventory_requirements(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'purchased', 'rejected')),
  performed_by uuid NOT NULL,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- 5. Enable RLS on new tables
ALTER TABLE public.daily_inventory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inventory_requirement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_approvals ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for daily_inventory_requirements
CREATE POLICY "Admins and super admins can view all requirements"
  ON public.daily_inventory_requirements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can create requirements"
  ON public.daily_inventory_requirements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super admins can approve requirements"
  ON public.daily_inventory_requirements FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR 
         (has_role(auth.uid(), 'admin'::app_role) AND status = 'approved'));

-- 7. RLS Policies for daily_inventory_requirement_items
CREATE POLICY "Admins and super admins can view all requirement items"
  ON public.daily_inventory_requirement_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage requirement items"
  ON public.daily_inventory_requirement_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 8. RLS Policies for inventory_approvals
CREATE POLICY "Admins and super admins can view approval logs"
  ON public.inventory_approvals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super admins can insert approval logs"
  ON public.inventory_approvals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 9. Create mark_advance_paid function
CREATE OR REPLACE FUNCTION public.mark_advance_paid(p_student_id uuid, p_payment_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile account_status
  UPDATE profiles
  SET account_status = 'advance_paid',
      updated_at = now()
  WHERE id = p_student_id;
  
  -- Notify super admins about new advance payment
  INSERT INTO notifications (user_id, title, message, type)
  SELECT ur.user_id,
         'New Advance Payment Received',
         'A student has paid the advance fee and is awaiting approval.',
         'info'
  FROM user_roles ur
  WHERE ur.role = 'super_admin';
END;
$$;

-- 10. Create approve_inventory_checklist function (super_admin only)
CREATE OR REPLACE FUNCTION public.approve_inventory_checklist(p_requirement_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is super_admin
  IF NOT has_role(v_user_id, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can approve inventory checklists';
  END IF;
  
  -- Get current status
  SELECT status INTO v_current_status
  FROM daily_inventory_requirements
  WHERE id = p_requirement_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Inventory requirement not found';
  END IF;
  
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Only pending checklists can be approved';
  END IF;
  
  -- Update the requirement status
  UPDATE daily_inventory_requirements
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_requirement_id;
  
  -- Log the approval
  INSERT INTO inventory_approvals (requirement_id, action, performed_by, notes)
  VALUES (p_requirement_id, 'approved', v_user_id, p_notes);
END;
$$;

-- 11. Create function to approve student access (super_admin only)
CREATE OR REPLACE FUNCTION public.approve_student_access(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is super_admin
  IF NOT has_role(v_user_id, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can approve student access';
  END IF;
  
  -- Get current status
  SELECT account_status INTO v_current_status
  FROM profiles
  WHERE id = p_student_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  IF v_current_status != 'advance_paid' THEN
    RAISE EXCEPTION 'Only students with advance_paid status can be approved';
  END IF;
  
  -- Update the profile status
  UPDATE profiles
  SET account_status = 'active',
      updated_at = now()
  WHERE id = p_student_id;
  
  -- Update student_access_approvals table if exists
  UPDATE student_access_approvals
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now(),
      updated_at = now()
  WHERE student_id = p_student_id;
  
  -- Notify the student
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_student_id, 'Access Approved!', 'Your account has been approved. You can now access your dashboard.', 'success');
END;
$$;

-- 12. Create function to generate daily inventory requirements from bookings
CREATE OR REPLACE FUNCTION public.generate_daily_inventory_requirements(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_requirement_id uuid;
  v_booking RECORD;
  v_ingredient RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin or super_admin
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can generate inventory requirements';
  END IF;
  
  -- Check if requirement already exists for this date
  SELECT id INTO v_requirement_id
  FROM daily_inventory_requirements
  WHERE requirement_date = p_date;
  
  IF v_requirement_id IS NOT NULL THEN
    RAISE EXCEPTION 'Inventory requirement already exists for this date';
  END IF;
  
  -- Create the requirement
  INSERT INTO daily_inventory_requirements (requirement_date, generated_by)
  VALUES (p_date, v_user_id)
  RETURNING id INTO v_requirement_id;
  
  -- Aggregate ingredients from all bookings for this date
  -- Each booking links to a course, course has recipes, recipes have ingredients via recipe_ingredients
  INSERT INTO daily_inventory_requirement_items (requirement_id, inventory_id, recipe_id, required_quantity, current_stock, to_purchase)
  SELECT 
    v_requirement_id,
    ri.inventory_id,
    r.id as recipe_id,
    SUM(ri.quantity_per_student) as required_quantity,
    COALESCE(i.current_stock, 0) as current_stock,
    GREATEST(SUM(ri.quantity_per_student) - COALESCE(i.current_stock, 0), 0) as to_purchase
  FROM bookings b
  JOIN recipes r ON r.course_id = b.course_id
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  JOIN inventory i ON i.id = ri.inventory_id
  WHERE b.booking_date = p_date
    AND b.status = 'confirmed'
  GROUP BY ri.inventory_id, r.id, i.current_stock
  ON CONFLICT (requirement_id, inventory_id) 
  DO UPDATE SET 
    required_quantity = daily_inventory_requirement_items.required_quantity + EXCLUDED.required_quantity,
    to_purchase = GREATEST(daily_inventory_requirement_items.required_quantity + EXCLUDED.required_quantity - daily_inventory_requirement_items.current_stock, 0);
  
  RETURN v_requirement_id;
END;
$$;

-- 13. Add trigger for updated_at on new tables
CREATE TRIGGER update_daily_inventory_requirements_updated_at
  BEFORE UPDATE ON public.daily_inventory_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 14. Update existing students with proper account_status based on their current state
UPDATE profiles p
SET account_status = 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM student_access_approvals saa 
      WHERE saa.student_id = p.id AND saa.status = 'approved'
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM advance_payments ap 
      WHERE ap.student_id = p.id AND ap.status = 'completed'
    ) THEN 'advance_paid'
    ELSE 'pending'
  END
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'student'
);
