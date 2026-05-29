
-- Auto-mark recipes complete when student is marked present
CREATE OR REPLACE FUNCTION public.mark_recipes_completed_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'present' THEN
    INSERT INTO public.student_recipe_progress (student_id, recipe_id, status, completed_at)
    SELECT NEW.student_id, rid, 'completed', now()
    FROM (
      SELECT DISTINCT unnest(
        CASE
          WHEN b.recipe_id IS NOT NULL THEN array_append(COALESCE(b.recipe_ids, '{}'::uuid[]), b.recipe_id)
          ELSE COALESCE(b.recipe_ids, '{}'::uuid[])
        END
      ) AS rid
      FROM public.bookings b
      WHERE b.student_id = NEW.student_id
        AND b.booking_date = NEW.class_date
        AND b.status IN ('confirmed', 'completed')
    ) src
    WHERE src.rid IS NOT NULL
    ON CONFLICT (student_id, recipe_id) DO UPDATE
      SET status = 'completed',
          completed_at = COALESCE(public.student_recipe_progress.completed_at, EXCLUDED.completed_at),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_mark_recipe_complete ON public.attendance;
CREATE TRIGGER trg_attendance_mark_recipe_complete
AFTER INSERT OR UPDATE OF status ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.mark_recipes_completed_on_attendance();

-- Backfill: mark recipes complete for all existing present attendance
INSERT INTO public.student_recipe_progress (student_id, recipe_id, status, completed_at)
SELECT DISTINCT a.student_id, rid, 'completed', now()
FROM public.attendance a
JOIN public.bookings b
  ON b.student_id = a.student_id
 AND b.booking_date = a.class_date
 AND b.status IN ('confirmed', 'completed')
CROSS JOIN LATERAL unnest(
  CASE
    WHEN b.recipe_id IS NOT NULL THEN array_append(COALESCE(b.recipe_ids, '{}'::uuid[]), b.recipe_id)
    ELSE COALESCE(b.recipe_ids, '{}'::uuid[])
  END
) AS rid
WHERE a.status = 'present' AND rid IS NOT NULL
ON CONFLICT (student_id, recipe_id) DO UPDATE
  SET status = 'completed',
      completed_at = COALESCE(public.student_recipe_progress.completed_at, EXCLUDED.completed_at),
      updated_at = now();
