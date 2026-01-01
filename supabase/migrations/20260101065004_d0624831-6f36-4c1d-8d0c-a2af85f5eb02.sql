
-- Drop and recreate the trigger function with proper JSONB handling
CREATE OR REPLACE FUNCTION public.trigger_auto_deduct_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_course_id UUID;
  v_recipe RECORD;
  v_recipe_ingredient RECORD;
  v_current_stock NUMERIC;
BEGIN
  -- Only process for 'present' status
  IF NEW.status = 'present' THEN
    -- Get course_id from batch
    SELECT course_id INTO v_course_id FROM batches WHERE id = NEW.batch_id;
    
    IF v_course_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Loop through recipes for this course that have linked ingredients in recipe_ingredients table
    FOR v_recipe IN 
      SELECT DISTINCT r.id, r.title 
      FROM recipes r
      INNER JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      WHERE r.course_id = v_course_id
    LOOP
      -- Loop through recipe_ingredients for this recipe
      FOR v_recipe_ingredient IN 
        SELECT ri.inventory_id, ri.quantity_per_student, i.name, i.unit, i.reorder_level
        FROM recipe_ingredients ri
        INNER JOIN inventory i ON i.id = ri.inventory_id
        WHERE ri.recipe_id = v_recipe.id
          AND ri.quantity_per_student > 0
      LOOP
        -- Deduct from inventory
        UPDATE inventory 
        SET current_stock = GREATEST(current_stock - v_recipe_ingredient.quantity_per_student, 0),
            updated_at = NOW()
        WHERE id = v_recipe_ingredient.inventory_id;
        
        -- Log the usage
        INSERT INTO inventory_usage (inventory_id, batch_id, quantity_used, used_by, notes)
        VALUES (
          v_recipe_ingredient.inventory_id,
          NEW.batch_id,
          v_recipe_ingredient.quantity_per_student,
          COALESCE(NEW.marked_by, auth.uid()),
          'Auto-deducted for ' || v_recipe.title || ' on attendance'
        );
        
        -- Get updated stock level
        SELECT current_stock INTO v_current_stock 
        FROM inventory 
        WHERE id = v_recipe_ingredient.inventory_id;
        
        -- Check for low stock alert
        IF v_current_stock < v_recipe_ingredient.reorder_level THEN
          -- Notify admins about low stock
          INSERT INTO notifications (user_id, title, message, type)
          SELECT ur.user_id, 
                 'Low Stock Alert',
                 v_recipe_ingredient.name || ' is running low. Current stock: ' || 
                 v_current_stock || ' ' || v_recipe_ingredient.unit,
                 'warning'
          FROM user_roles ur
          WHERE ur.role = 'admin'
          -- Avoid duplicate notifications within 24 hours
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = ur.user_id
              AND n.title = 'Low Stock Alert'
              AND n.message LIKE v_recipe_ingredient.name || '%'
              AND n.created_at > NOW() - INTERVAL '24 hours'
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on attendance table
DROP TRIGGER IF EXISTS auto_deduct_inventory_on_attendance ON attendance;
CREATE TRIGGER auto_deduct_inventory_on_attendance
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_deduct_inventory();
