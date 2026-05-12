CREATE OR REPLACE FUNCTION public.confirm_batch_completion(p_batch_date date, p_time_slot text, p_recipe_id uuid, p_attendance jsonb, p_session_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_chef_id uuid;
  v_entry jsonb;
  v_student_id uuid;
  v_booking_id uuid;
  v_status text;
  v_present_count integer := 0;
  v_no_show_count integer;
  v_ingredient record;
  v_recipe_batch_id uuid;
  v_course_id uuid;
  v_recipe_title text;
  v_session_label text;
BEGIN
  v_chef_id := auth.uid();

  IF NOT has_role(v_chef_id, 'chef'::app_role) THEN
    RAISE EXCEPTION 'Only chefs can confirm batch completion';
  END IF;

  SELECT rb.id, rb.course_id INTO v_recipe_batch_id, v_course_id
  FROM recipe_batches rb
  WHERE rb.recipe_id = p_recipe_id
    AND rb.batch_date = p_batch_date
    AND rb.time_slot = p_time_slot
    AND rb.status = 'scheduled';

  IF v_recipe_batch_id IS NULL THEN
    SELECT DISTINCT b.course_id INTO v_course_id
    FROM bookings b
    WHERE b.recipe_id = p_recipe_id
      AND b.booking_date = p_batch_date
      AND b.time_slot = p_time_slot
    LIMIT 1;

    IF v_course_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Batch not found or already completed');
    END IF;
  END IF;

  -- Resolve recipe title for notifications
  IF p_recipe_id IS NOT NULL THEN
    SELECT title INTO v_recipe_title FROM recipes WHERE id = p_recipe_id;
  END IF;
  v_session_label := COALESCE(v_recipe_title, 'your session') || ' (' || p_time_slot || ' on ' || to_char(p_batch_date, 'Mon DD, YYYY') || ')';

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    IF (v_entry->>'status') = 'present' THEN
      v_present_count := v_present_count + 1;
    END IF;
  END LOOP;

  IF p_recipe_id IS NOT NULL AND v_present_count > 0 THEN
    FOR v_ingredient IN
      SELECT ri.inventory_id, ri.quantity_per_student, i.current_stock, i.name, i.unit
      FROM recipe_ingredients ri
      JOIN inventory i ON i.id = ri.inventory_id
      WHERE ri.recipe_id = p_recipe_id
    LOOP
      IF v_ingredient.current_stock < (v_ingredient.quantity_per_student * v_present_count) THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', format('Insufficient inventory: %s needs %s %s, only %s available',
            v_ingredient.name,
            (v_ingredient.quantity_per_student * v_present_count)::text,
            v_ingredient.unit,
            v_ingredient.current_stock::text
          )
        );
      END IF;
    END LOOP;
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    v_student_id := (v_entry->>'student_id')::uuid;
    v_booking_id := (v_entry->>'booking_id')::uuid;
    v_status := v_entry->>'status';

    IF v_status = 'present' THEN
      UPDATE bookings SET status = 'attended', updated_at = now() WHERE id = v_booking_id;

      IF p_recipe_id IS NOT NULL THEN
        PERFORM mark_recipe_complete_by_chef(v_student_id, p_recipe_id);
      END IF;

      INSERT INTO attendance (student_id, batch_id, class_date, status, marked_by)
      VALUES (v_student_id, v_booking_id, p_batch_date, 'present', v_chef_id)
      ON CONFLICT DO NOTHING;

      -- Notify present student: attendance confirmed + next steps
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        v_student_id,
        'Attendance Confirmed',
        'Great work! Your attendance for ' || v_session_label || ' has been marked as Present and your recipe progress has been updated. Next step: head to "My Bookings" to book your next session.',
        'success'
      );

    ELSIF v_status = 'absent' THEN
      UPDATE bookings SET status = 'no_show', updated_at = now() WHERE id = v_booking_id;

      INSERT INTO attendance (student_id, batch_id, class_date, status, marked_by)
      VALUES (v_student_id, v_booking_id, p_batch_date, 'no_show', v_chef_id)
      ON CONFLICT DO NOTHING;

      SELECT COUNT(*) INTO v_no_show_count
      FROM attendance WHERE student_id = v_student_id AND status = 'no_show';

      IF v_no_show_count >= 3 THEN
        UPDATE profiles SET enrollment_status = 'locked_no_show', updated_at = now()
        WHERE id = v_student_id AND enrollment_status = 'active';

        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_student_id, 'Account Locked', 'You missed ' || v_session_label || ' and your account has been locked due to 3+ no-shows. Please contact admin to unlock your account.', 'warning');
      ELSIF v_no_show_count = 2 THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_student_id, 'Missed Session - Warning', 'You were marked No Show for ' || v_session_label || '. This is your 2nd no-show — one more will lock your account. Next step: rebook this recipe from "My Bookings".', 'warning');
      ELSE
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_student_id, 'Missed Session', 'You were marked No Show for ' || v_session_label || '. Next step: rebook this recipe from "My Bookings" to keep your progress on track.', 'alert');
      END IF;
    END IF;
  END LOOP;

  IF p_recipe_id IS NOT NULL AND v_present_count > 0 THEN
    FOR v_ingredient IN
      SELECT ri.inventory_id, ri.quantity_per_student
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id
    LOOP
      PERFORM safe_deduct_inventory(
        v_ingredient.inventory_id,
        v_ingredient.quantity_per_student * v_present_count,
        v_chef_id,
        format('Batch completion: %s present students', v_present_count)
      );
    END LOOP;
  END IF;

  IF v_recipe_batch_id IS NOT NULL THEN
    UPDATE recipe_batches
    SET status = 'completed',
        session_notes = COALESCE(p_session_notes, session_notes),
        session_notes_by = CASE WHEN p_session_notes IS NOT NULL THEN v_chef_id ELSE session_notes_by END,
        session_notes_at = CASE WHEN p_session_notes IS NOT NULL THEN now() ELSE session_notes_at END,
        updated_at = now()
    WHERE id = v_recipe_batch_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Batch completed successfully');
END;
$function$;