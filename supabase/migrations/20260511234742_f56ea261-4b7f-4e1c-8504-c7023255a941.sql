ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recipe_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_chef_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS table_numbers text[] NOT NULL DEFAULT '{}';

-- Backfill arrays from existing scalar columns
UPDATE public.bookings
SET recipe_ids = CASE WHEN recipe_id IS NOT NULL AND NOT (recipe_id = ANY(recipe_ids))
                      THEN array_append(recipe_ids, recipe_id) ELSE recipe_ids END,
    assigned_chef_ids = CASE WHEN assigned_chef_id IS NOT NULL AND NOT (assigned_chef_id = ANY(assigned_chef_ids))
                             THEN array_append(assigned_chef_ids, assigned_chef_id) ELSE assigned_chef_ids END,
    table_numbers = CASE WHEN table_number IS NOT NULL AND NOT (table_number = ANY(table_numbers))
                         THEN array_append(table_numbers, table_number) ELSE table_numbers END
WHERE recipe_id IS NOT NULL OR assigned_chef_id IS NOT NULL OR table_number IS NOT NULL;

-- Trigger: keep scalar fields in sync with the first array element for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_booking_scalar_assignments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.recipe_id := CASE WHEN array_length(NEW.recipe_ids, 1) > 0 THEN NEW.recipe_ids[1] ELSE NULL END;
  NEW.assigned_chef_id := CASE WHEN array_length(NEW.assigned_chef_ids, 1) > 0 THEN NEW.assigned_chef_ids[1] ELSE NULL END;
  NEW.table_number := CASE WHEN array_length(NEW.table_numbers, 1) > 0 THEN NEW.table_numbers[1] ELSE NULL END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_booking_scalar_assignments_trg ON public.bookings;
CREATE TRIGGER sync_booking_scalar_assignments_trg
BEFORE INSERT OR UPDATE OF recipe_ids, assigned_chef_ids, table_numbers ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_scalar_assignments();