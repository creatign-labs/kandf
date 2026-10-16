CREATE OR REPLACE FUNCTION public.admin_delete_recipes(p_recipe_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_count integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can delete recipes' USING ERRCODE = '42501';
  END IF;

  IF p_recipe_ids IS NULL THEN
    SELECT array_agg(id) INTO v_ids FROM recipes;
  ELSE
    v_ids := p_recipe_ids;
  END IF;
  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (SELECT 1 FROM recipe_batches WHERE recipe_id = ANY(v_ids))
     OR EXISTS (SELECT 1 FROM recipe_batch_audit_log WHERE recipe_id = ANY(v_ids)) THEN
    RAISE EXCEPTION 'Some recipes already have class sessions booked or held. Those recipes cannot be deleted because class history depends on them.' USING ERRCODE = '23503';
  END IF;

  DELETE FROM course_recipes WHERE recipe_id = ANY(v_ids);
  DELETE FROM recipe_ingredients WHERE recipe_id = ANY(v_ids);
  DELETE FROM chef_specializations WHERE recipe_id = ANY(v_ids);
  DELETE FROM student_online_recipes WHERE recipe_id = ANY(v_ids);
  DELETE FROM student_recipe_progress WHERE recipe_id = ANY(v_ids);
  UPDATE daily_inventory_requirement_items SET recipe_id = NULL WHERE recipe_id = ANY(v_ids);
  UPDATE bookings SET recipe_id = NULL, recipe_ids = array(SELECT x FROM unnest(recipe_ids) x WHERE x <> ALL(v_ids))
    WHERE recipe_id = ANY(v_ids) OR recipe_ids && v_ids;

  DELETE FROM recipes WHERE id = ANY(v_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_recipes(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_recipes(uuid[]) TO authenticated;