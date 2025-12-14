
-- Add student_id column to enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Add invoice_number column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Create function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number(p_course_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title TEXT;
  v_prefix TEXT;
  v_year TEXT;
  v_count INTEGER;
BEGIN
  -- Get course title
  SELECT title INTO v_course_title FROM courses WHERE id = p_course_id;
  
  -- Generate prefix from first letters of course title words
  v_prefix := UPPER(LEFT(REPLACE(v_course_title, ' ', ''), 3));
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Count existing certificates for this course this year
  SELECT COUNT(*) + 1 INTO v_count 
  FROM certificates 
  WHERE course_id = p_course_id 
  AND EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM NOW());
  
  RETURN 'KF-' || v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Create function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id(p_course_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title TEXT;
  v_prefix TEXT;
  v_count INTEGER;
BEGIN
  -- Get course title
  SELECT title INTO v_course_title FROM courses WHERE id = p_course_id;
  
  -- Generate prefix (A for first course, B for second, etc.)
  SELECT CASE 
    WHEN v_course_title ILIKE '%foundation%' THEN 'A'
    WHEN v_course_title ILIKE '%advanced%' THEN 'B'
    WHEN v_course_title ILIKE '%professional%' OR v_course_title ILIKE '%mastery%' THEN 'C'
    ELSE UPPER(LEFT(v_course_title, 1))
  END INTO v_prefix;
  
  -- Count existing enrollments for this course
  SELECT COUNT(*) + 1 INTO v_count 
  FROM enrollments 
  WHERE course_id = p_course_id 
  AND student_id IS NOT NULL;
  
  RETURN v_prefix || v_count::TEXT;
END;
$$;

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_month := TO_CHAR(NOW(), 'MM');
  
  -- Count existing payments this month
  SELECT COUNT(*) + 1 INTO v_count 
  FROM payments 
  WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM NOW())
  AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM NOW());
  
  RETURN 'INV-' || v_year || v_month || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Create trigger function for auto-certificate generation
CREATE OR REPLACE FUNCTION public.trigger_auto_generate_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when progress becomes 100
  IF NEW.progress = 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
    -- Check if certificate doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM certificates 
      WHERE student_id = NEW.student_id AND course_id = NEW.course_id
    ) THEN
      -- Insert certificate
      INSERT INTO certificates (student_id, course_id, certificate_number, status)
      VALUES (
        NEW.student_id,
        NEW.course_id,
        generate_certificate_number(NEW.course_id),
        'issued'
      );
      
      -- Create notification for student
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.student_id,
        'Certificate Earned!',
        'Congratulations! You have successfully completed the course and earned your certificate.',
        'success'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on enrollments
DROP TRIGGER IF EXISTS auto_generate_certificate_trigger ON enrollments;
CREATE TRIGGER auto_generate_certificate_trigger
AFTER UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_generate_certificate();

-- Create trigger function for auto-inventory deduction on attendance
CREATE OR REPLACE FUNCTION public.trigger_auto_deduct_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_recipe RECORD;
  v_ingredient RECORD;
  v_inventory_item RECORD;
  v_quantity_per_student NUMERIC;
BEGIN
  -- Only process for 'present' status
  IF NEW.status = 'present' THEN
    -- Get course_id from batch
    SELECT course_id INTO v_course_id FROM batches WHERE id = NEW.batch_id;
    
    -- Loop through recipes for this course
    FOR v_recipe IN 
      SELECT id, ingredients FROM recipes WHERE course_id = v_course_id AND ingredients IS NOT NULL
    LOOP
      -- Loop through ingredients in the recipe
      IF v_recipe.ingredients IS NOT NULL AND jsonb_typeof(v_recipe.ingredients) = 'array' THEN
        FOR v_ingredient IN 
          SELECT * FROM jsonb_array_elements(v_recipe.ingredients)
        LOOP
          -- Find matching inventory item
          SELECT * INTO v_inventory_item 
          FROM inventory 
          WHERE LOWER(name) = LOWER(v_ingredient->>'name')
          LIMIT 1;
          
          IF v_inventory_item.id IS NOT NULL THEN
            -- Parse quantity (assuming format like "100g" or "2 cups")
            v_quantity_per_student := COALESCE(
              (regexp_match(v_ingredient->>'quantity', '(\d+\.?\d*)'))[1]::NUMERIC / 10, -- Divide by 10 for per-student portion
              0.1
            );
            
            -- Deduct from inventory
            UPDATE inventory 
            SET current_stock = GREATEST(current_stock - v_quantity_per_student, 0),
                updated_at = NOW()
            WHERE id = v_inventory_item.id;
            
            -- Log the usage
            INSERT INTO inventory_usage (inventory_id, batch_id, quantity_used, used_by, notes)
            VALUES (
              v_inventory_item.id,
              NEW.batch_id,
              v_quantity_per_student,
              NEW.marked_by,
              'Auto-deducted on attendance'
            );
            
            -- Check for low stock alert
            IF (SELECT current_stock FROM inventory WHERE id = v_inventory_item.id) < v_inventory_item.reorder_level THEN
              -- Notify admins about low stock
              INSERT INTO notifications (user_id, title, message, type)
              SELECT ur.user_id, 
                     'Low Stock Alert',
                     v_inventory_item.name || ' is running low. Current stock: ' || 
                     (SELECT current_stock FROM inventory WHERE id = v_inventory_item.id) || ' ' || v_inventory_item.unit,
                     'warning'
              FROM user_roles ur
              WHERE ur.role = 'admin';
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on attendance
DROP TRIGGER IF EXISTS auto_deduct_inventory_trigger ON attendance;
CREATE TRIGGER auto_deduct_inventory_trigger
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_deduct_inventory();
