-- =====================================================
-- RECIPE-BASED BATCH GROUPING SYSTEM
-- =====================================================

-- 1. Create recipe_batches table - the core entity for recipe-based grouping
CREATE TABLE public.recipe_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  batch_date DATE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  is_manually_adjusted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, recipe_id, time_slot, batch_date)
);

-- 2. Create recipe_batch_memberships table - links students to recipe batches
CREATE TABLE public.recipe_batch_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_batch_id UUID NOT NULL REFERENCES public.recipe_batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  is_manual_assignment BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_batch_id, student_id)
);

-- 3. Create recipe_batch_audit_log table - tracks all manual changes
CREATE TABLE public.recipe_batch_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'move', 'add', 'remove', 'reassign'
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id),
  previous_batch_id UUID REFERENCES public.recipe_batches(id),
  new_batch_id UUID REFERENCES public.recipe_batches(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS on all tables
ALTER TABLE public.recipe_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_batch_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_batch_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for recipe_batches
CREATE POLICY "Admins can manage recipe batches"
  ON public.recipe_batches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Chefs can view recipe batches"
  ON public.recipe_batches FOR SELECT
  USING (has_role(auth.uid(), 'chef'::app_role));

CREATE POLICY "Students can view their enrolled recipe batches"
  ON public.recipe_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipe_batch_memberships rbm
      WHERE rbm.recipe_batch_id = id AND rbm.student_id = auth.uid()
    )
  );

-- 6. RLS Policies for recipe_batch_memberships
CREATE POLICY "Admins can manage memberships"
  ON public.recipe_batch_memberships FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Chefs can view memberships"
  ON public.recipe_batch_memberships FOR SELECT
  USING (has_role(auth.uid(), 'chef'::app_role));

CREATE POLICY "Students can view own memberships"
  ON public.recipe_batch_memberships FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own memberships"
  ON public.recipe_batch_memberships FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- 7. RLS Policies for audit log
CREATE POLICY "Only admins can view audit logs"
  ON public.recipe_batch_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert audit logs"
  ON public.recipe_batch_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 8. Function to get student's next incomplete recipe
CREATE OR REPLACE FUNCTION public.get_next_incomplete_recipe(p_student_id uuid, p_course_id uuid)
RETURNS TABLE (
  recipe_id uuid,
  recipe_title text,
  recipe_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ordered_recipes AS (
    SELECT 
      r.id,
      r.title,
      ROW_NUMBER() OVER (ORDER BY r.created_at) as recipe_order
    FROM recipes r
    WHERE r.course_id = p_course_id
  ),
  completed_recipes AS (
    SELECT srp.recipe_id
    FROM student_recipe_progress srp
    WHERE srp.student_id = p_student_id AND srp.status = 'completed'
  )
  SELECT 
    orec.id,
    orec.title,
    orec.recipe_order::integer
  FROM ordered_recipes orec
  WHERE orec.id NOT IN (SELECT cr.recipe_id FROM completed_recipes cr)
  ORDER BY orec.recipe_order
  LIMIT 1;
END;
$$;

-- 9. Function to check student eligibility for booking
CREATE OR REPLACE FUNCTION public.check_student_booking_eligibility(p_student_id uuid)
RETURNS TABLE (
  is_eligible boolean,
  reason text,
  next_recipe_id uuid,
  next_recipe_title text,
  course_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
  v_global_booking_enabled boolean;
BEGIN
  -- Check student profile status
  SELECT * INTO v_profile FROM profiles WHERE id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Student not found'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF v_profile.account_status != 'active' THEN
    RETURN QUERY SELECT false, ('Account status is ' || v_profile.account_status)::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if student has active enrollment
  SELECT * INTO v_enrollment FROM enrollments 
  WHERE student_id = p_student_id AND status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No active enrollment found'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check global slot booking toggle (via any batch being enabled)
  SELECT EXISTS (SELECT 1 FROM batches WHERE booking_enabled = true) INTO v_global_booking_enabled;
  
  IF NOT v_global_booking_enabled THEN
    RETURN QUERY SELECT false, 'Slot booking is currently closed'::text, NULL::uuid, NULL::text, v_enrollment.course_id;
    RETURN;
  END IF;
  
  -- Get next incomplete recipe
  RETURN QUERY
  SELECT 
    true,
    'Eligible'::text,
    nir.recipe_id,
    nir.recipe_title,
    v_enrollment.course_id
  FROM get_next_incomplete_recipe(p_student_id, v_enrollment.course_id) nir;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'All recipes completed'::text, NULL::uuid, NULL::text, v_enrollment.course_id;
  END IF;
END;
$$;

-- 10. Function to get available recipe batch slots
CREATE OR REPLACE FUNCTION public.get_available_recipe_slots(
  p_course_id uuid,
  p_recipe_id uuid,
  p_from_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  batch_date date,
  time_slot text,
  recipe_batch_id uuid,
  capacity integer,
  current_count bigint,
  available_spots bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Get existing batches with availability
  SELECT 
    rb.batch_date,
    rb.time_slot,
    rb.id as recipe_batch_id,
    rb.capacity,
    COUNT(rbm.id) as current_count,
    (rb.capacity - COUNT(rbm.id)) as available_spots
  FROM recipe_batches rb
  LEFT JOIN recipe_batch_memberships rbm ON rbm.recipe_batch_id = rb.id
  WHERE rb.course_id = p_course_id
    AND rb.recipe_id = p_recipe_id
    AND rb.batch_date > p_from_date
  GROUP BY rb.id, rb.batch_date, rb.time_slot, rb.capacity
  HAVING (rb.capacity - COUNT(rbm.id)) > 0
  
  UNION ALL
  
  -- Get available slots from regular batches that don't have recipe batches yet
  SELECT 
    d.batch_date,
    b.time_slot,
    NULL::uuid as recipe_batch_id,
    b.total_seats as capacity,
    0::bigint as current_count,
    b.total_seats::bigint as available_spots
  FROM batches b
  CROSS JOIN generate_series(p_from_date + 1, p_from_date + 30, '1 day'::interval) AS d(batch_date)
  WHERE b.course_id = p_course_id
    AND b.booking_enabled = true
    AND b.available_seats > 0
    AND NOT EXISTS (
      SELECT 1 FROM recipe_batches rb
      WHERE rb.course_id = p_course_id
        AND rb.recipe_id = p_recipe_id
        AND rb.time_slot = b.time_slot
        AND rb.batch_date = d.batch_date::date
    )
  ORDER BY batch_date, time_slot;
END;
$$;

-- 11. Function to book a recipe slot (auto-grouping logic)
CREATE OR REPLACE FUNCTION public.book_recipe_slot(
  p_student_id uuid,
  p_course_id uuid,
  p_recipe_id uuid,
  p_batch_date date,
  p_time_slot text
)
RETURNS TABLE (
  success boolean,
  message text,
  recipe_batch_id uuid,
  booking_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_batch_id uuid;
  v_booking_id uuid;
  v_capacity integer;
  v_current_count integer;
BEGIN
  -- Check eligibility first
  IF NOT EXISTS (
    SELECT 1 FROM check_student_booking_eligibility(p_student_id)
    WHERE is_eligible = true AND next_recipe_id = p_recipe_id
  ) THEN
    RETURN QUERY SELECT false, 'Not eligible to book this recipe'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check if student already has a booking for this recipe
  IF EXISTS (
    SELECT 1 FROM recipe_batch_memberships rbm
    JOIN recipe_batches rb ON rb.id = rbm.recipe_batch_id
    WHERE rbm.student_id = p_student_id AND rb.recipe_id = p_recipe_id
  ) THEN
    RETURN QUERY SELECT false, 'Already booked for this recipe'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Check date is in future
  IF p_batch_date <= CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Booking date must be at least one day in advance'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Find or create recipe batch
  SELECT id, capacity INTO v_recipe_batch_id, v_capacity
  FROM recipe_batches
  WHERE course_id = p_course_id
    AND recipe_id = p_recipe_id
    AND time_slot = p_time_slot
    AND batch_date = p_batch_date;
  
  IF v_recipe_batch_id IS NULL THEN
    -- Get capacity from regular batches
    SELECT total_seats INTO v_capacity
    FROM batches
    WHERE course_id = p_course_id
      AND time_slot = p_time_slot
      AND booking_enabled = true
    LIMIT 1;
    
    IF v_capacity IS NULL THEN
      v_capacity := 10; -- Default capacity
    END IF;
    
    -- Create new recipe batch
    INSERT INTO recipe_batches (course_id, recipe_id, time_slot, batch_date, capacity)
    VALUES (p_course_id, p_recipe_id, p_time_slot, p_batch_date, v_capacity)
    RETURNING id INTO v_recipe_batch_id;
  END IF;
  
  -- Check capacity
  SELECT COUNT(*) INTO v_current_count
  FROM recipe_batch_memberships
  WHERE recipe_batch_id = v_recipe_batch_id;
  
  IF v_current_count >= v_capacity THEN
    RETURN QUERY SELECT false, 'Batch is full'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Create booking record
  INSERT INTO bookings (student_id, course_id, booking_date, time_slot, recipe_id, status)
  VALUES (p_student_id, p_course_id, p_batch_date, p_time_slot, p_recipe_id, 'confirmed')
  RETURNING id INTO v_booking_id;
  
  -- Add student to recipe batch
  INSERT INTO recipe_batch_memberships (recipe_batch_id, student_id, booking_id, is_manual_assignment)
  VALUES (v_recipe_batch_id, p_student_id, v_booking_id, false);
  
  RETURN QUERY SELECT true, 'Booking confirmed'::text, v_recipe_batch_id, v_booking_id;
END;
$$;

-- 12. Function to cancel recipe booking
CREATE OR REPLACE FUNCTION public.cancel_recipe_booking(p_student_id uuid, p_booking_id uuid)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  -- Get booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND student_id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text;
    RETURN;
  END IF;
  
  -- Check cancellation deadline (before 11:59 PM previous day)
  IF v_booking.booking_date <= CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Cannot cancel - deadline has passed'::text;
    RETURN;
  END IF;
  
  -- Remove from recipe batch membership
  DELETE FROM recipe_batch_memberships WHERE booking_id = p_booking_id;
  
  -- Update booking status
  UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = p_booking_id;
  
  RETURN QUERY SELECT true, 'Booking cancelled successfully'::text;
END;
$$;

-- 13. Function for admin to move student between batches (manual override)
CREATE OR REPLACE FUNCTION public.admin_move_student_batch(
  p_student_id uuid,
  p_from_batch_id uuid,
  p_to_batch_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_batch recipe_batches%ROWTYPE;
  v_to_batch recipe_batches%ROWTYPE;
  v_to_count integer;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Check admin permission
  IF NOT (has_role(v_actor_id, 'admin'::app_role) OR has_role(v_actor_id, 'super_admin'::app_role)) THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text;
    RETURN;
  END IF;
  
  -- Get both batches
  SELECT * INTO v_from_batch FROM recipe_batches WHERE id = p_from_batch_id;
  SELECT * INTO v_to_batch FROM recipe_batches WHERE id = p_to_batch_id;
  
  IF v_from_batch.id IS NULL OR v_to_batch.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid batch'::text;
    RETURN;
  END IF;
  
  -- CONSTRAINT: Cannot move across different recipes
  IF v_from_batch.recipe_id != v_to_batch.recipe_id THEN
    RETURN QUERY SELECT false, 'Cannot move student between different recipes'::text;
    RETURN;
  END IF;
  
  -- Check target batch capacity
  SELECT COUNT(*) INTO v_to_count FROM recipe_batch_memberships WHERE recipe_batch_id = p_to_batch_id;
  
  IF v_to_count >= v_to_batch.capacity THEN
    RETURN QUERY SELECT false, 'Target batch is at capacity'::text;
    RETURN;
  END IF;
  
  -- Move membership
  UPDATE recipe_batch_memberships
  SET recipe_batch_id = p_to_batch_id,
      is_manual_assignment = true,
      assigned_by = v_actor_id,
      assigned_at = now()
  WHERE recipe_batch_id = p_from_batch_id AND student_id = p_student_id;
  
  -- Mark target batch as manually adjusted
  UPDATE recipe_batches SET is_manually_adjusted = true, updated_at = now() WHERE id = p_to_batch_id;
  
  -- Update booking if exists
  UPDATE bookings b
  SET time_slot = v_to_batch.time_slot,
      booking_date = v_to_batch.batch_date,
      updated_at = now()
  FROM recipe_batch_memberships rbm
  WHERE rbm.booking_id = b.id
    AND rbm.student_id = p_student_id
    AND rbm.recipe_batch_id = p_to_batch_id;
  
  -- Log audit
  INSERT INTO recipe_batch_audit_log (actor_id, action, student_id, course_id, recipe_id, previous_batch_id, new_batch_id, reason)
  VALUES (v_actor_id, 'move', p_student_id, v_from_batch.course_id, v_from_batch.recipe_id, p_from_batch_id, p_to_batch_id, p_reason);
  
  RETURN QUERY SELECT true, 'Student moved successfully'::text;
END;
$$;

-- 14. Function for admin to remove student from batch
CREATE OR REPLACE FUNCTION public.admin_remove_student_from_batch(
  p_student_id uuid,
  p_batch_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch recipe_batches%ROWTYPE;
  v_booking_id uuid;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Check admin permission
  IF NOT (has_role(v_actor_id, 'admin'::app_role) OR has_role(v_actor_id, 'super_admin'::app_role)) THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text;
    RETURN;
  END IF;
  
  -- Get batch
  SELECT * INTO v_batch FROM recipe_batches WHERE id = p_batch_id;
  
  IF v_batch.id IS NULL THEN
    RETURN QUERY SELECT false, 'Batch not found'::text;
    RETURN;
  END IF;
  
  -- Get booking id before removal
  SELECT booking_id INTO v_booking_id 
  FROM recipe_batch_memberships 
  WHERE recipe_batch_id = p_batch_id AND student_id = p_student_id;
  
  -- Remove membership
  DELETE FROM recipe_batch_memberships 
  WHERE recipe_batch_id = p_batch_id AND student_id = p_student_id;
  
  -- Cancel associated booking
  IF v_booking_id IS NOT NULL THEN
    UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = v_booking_id;
  END IF;
  
  -- Log audit
  INSERT INTO recipe_batch_audit_log (actor_id, action, student_id, course_id, recipe_id, previous_batch_id, new_batch_id, reason)
  VALUES (v_actor_id, 'remove', p_student_id, v_batch.course_id, v_batch.recipe_id, p_batch_id, NULL, p_reason);
  
  RETURN QUERY SELECT true, 'Student removed from batch'::text;
END;
$$;

-- 15. Update trigger for updated_at
CREATE TRIGGER update_recipe_batches_updated_at
  BEFORE UPDATE ON public.recipe_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 16. Create indexes for performance
CREATE INDEX idx_recipe_batches_course_recipe ON public.recipe_batches(course_id, recipe_id);
CREATE INDEX idx_recipe_batches_date ON public.recipe_batches(batch_date);
CREATE INDEX idx_recipe_batch_memberships_student ON public.recipe_batch_memberships(student_id);
CREATE INDEX idx_recipe_batch_memberships_batch ON public.recipe_batch_memberships(recipe_batch_id);
CREATE INDEX idx_recipe_batch_audit_log_student ON public.recipe_batch_audit_log(student_id);
CREATE INDEX idx_recipe_batch_audit_log_actor ON public.recipe_batch_audit_log(actor_id);