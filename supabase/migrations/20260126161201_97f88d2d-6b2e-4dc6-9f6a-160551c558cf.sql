-- Fix the get_available_recipe_slots function - cast generate_series output to date
CREATE OR REPLACE FUNCTION public.get_available_recipe_slots(p_course_id uuid, p_recipe_id uuid, p_from_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(batch_date date, time_slot text, recipe_batch_id uuid, capacity integer, current_count bigint, available_spots bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    d.batch_date::date,
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
$function$;