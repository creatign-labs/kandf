CREATE OR REPLACE FUNCTION public.generate_daily_inventory_requirements(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_requirement_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can generate inventory requirements';
  END IF;

  SELECT id INTO v_requirement_id
  FROM public.daily_inventory_requirements
  WHERE requirement_date = p_date;

  IF v_requirement_id IS NOT NULL THEN
    RAISE EXCEPTION 'Inventory requirement already exists for this date';
  END IF;

  INSERT INTO public.daily_inventory_requirements (requirement_date, generated_by)
  VALUES (p_date, v_user_id)
  RETURNING id INTO v_requirement_id;

  WITH target_bookings AS (
    SELECT
      b.id,
      b.student_id,
      b.course_id,
      b.recipe_id,
      COALESCE(b.recipe_ids, '{}'::uuid[]) AS recipe_ids
    FROM public.bookings b
    WHERE b.booking_date = p_date
      AND b.status = 'confirmed'
  ),
  explicitly_assigned AS (
    SELECT DISTINCT
      tb.id AS booking_id,
      tb.student_id,
      unnest(
        CASE
          WHEN cardinality(tb.recipe_ids) > 0 THEN tb.recipe_ids
          WHEN tb.recipe_id IS NOT NULL THEN ARRAY[tb.recipe_id]
          ELSE '{}'::uuid[]
        END
      ) AS recipe_id
    FROM target_bookings tb
    WHERE cardinality(tb.recipe_ids) > 0 OR tb.recipe_id IS NOT NULL
  ),
  course_fallback AS (
    SELECT DISTINCT
      tb.id AS booking_id,
      tb.student_id,
      cr.recipe_id
    FROM target_bookings tb
    JOIN public.course_recipes cr ON cr.course_id = tb.course_id
    WHERE cardinality(tb.recipe_ids) = 0
      AND tb.recipe_id IS NULL
      AND tb.course_id IS NOT NULL
  ),
  resolved_booking_recipes AS (
    SELECT * FROM explicitly_assigned
    UNION
    SELECT * FROM course_fallback
  ),
  ingredient_totals AS (
    SELECT
      ri.inventory_id,
      MIN(rbr.recipe_id) AS display_recipe_id,
      SUM(ri.quantity_per_student) AS required_quantity,
      COALESCE(i.current_stock, 0) AS current_stock
    FROM resolved_booking_recipes rbr
    JOIN public.recipe_ingredients ri ON ri.recipe_id = rbr.recipe_id
    JOIN public.inventory i ON i.id = ri.inventory_id
    GROUP BY ri.inventory_id, i.current_stock
  )
  INSERT INTO public.daily_inventory_requirement_items (
    requirement_id,
    inventory_id,
    recipe_id,
    required_quantity,
    current_stock,
    to_purchase
  )
  SELECT
    v_requirement_id,
    it.inventory_id,
    it.display_recipe_id,
    it.required_quantity,
    it.current_stock,
    GREATEST(it.required_quantity - it.current_stock, 0)
  FROM ingredient_totals it
  ON CONFLICT (requirement_id, inventory_id)
  DO UPDATE SET
    required_quantity = EXCLUDED.required_quantity,
    current_stock = EXCLUDED.current_stock,
    to_purchase = GREATEST(EXCLUDED.required_quantity - EXCLUDED.current_stock, 0),
    recipe_id = EXCLUDED.recipe_id;

  RETURN v_requirement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_inventory_requirements(date) TO authenticated;