-- 1. Add batch_id to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_batch_date_status
  ON public.bookings(batch_id, booking_date, status);

-- 2. Best-effort backfill: link old bookings to their batch when exactly one matches
UPDATE public.bookings b
SET batch_id = sub.batch_id
FROM (
  SELECT bk.id AS booking_id,
         (ARRAY_AGG(ba.id))[1] AS batch_id,
         COUNT(*) AS match_count
  FROM public.bookings bk
  JOIN public.batches ba
    ON ba.course_id = bk.course_id
   AND ba.time_slot = bk.time_slot
   AND (ba.start_date IS NULL OR bk.booking_date >= ba.start_date)
   AND (ba.end_date   IS NULL OR bk.booking_date <= ba.end_date)
   AND (
     ba.days_of_week IS NULL
     OR array_length(ba.days_of_week, 1) IS NULL
     OR public.date_matches_course_days(bk.booking_date, ba.days_of_week)
   )
  WHERE bk.batch_id IS NULL
  GROUP BY bk.id
) sub
WHERE b.id = sub.booking_id
  AND sub.match_count = 1;

-- 3. Strict per-batch booking RPC
CREATE OR REPLACE FUNCTION public.book_batch_slot(
  p_student_id uuid,
  p_batch_id uuid,
  p_batch_date date
)
RETURNS TABLE(success boolean, message text, booking_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.batches%ROWTYPE;
  v_count int;
  v_booking_id uuid;
BEGIN
  -- Lock the batch row to prevent race conditions
  SELECT * INTO v_batch FROM public.batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Batch not found'::text, NULL::uuid; RETURN;
  END IF;

  IF COALESCE(v_batch.booking_enabled, true) = false THEN
    RETURN QUERY SELECT false, 'Booking is closed for this batch'::text, NULL::uuid; RETURN;
  END IF;

  -- One-day-in-advance rule
  IF p_batch_date <= CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Slots must be booked at least one day in advance'::text, NULL::uuid; RETURN;
  END IF;

  -- Strict start/end window
  IF v_batch.start_date IS NOT NULL AND p_batch_date < v_batch.start_date THEN
    RETURN QUERY SELECT false, 'Selected date is before this batch starts'::text, NULL::uuid; RETURN;
  END IF;
  IF v_batch.end_date IS NOT NULL AND p_batch_date > v_batch.end_date THEN
    RETURN QUERY SELECT false, 'Selected date is after this batch ends'::text, NULL::uuid; RETURN;
  END IF;

  -- Strict day-of-week
  IF v_batch.days_of_week IS NOT NULL
     AND array_length(v_batch.days_of_week, 1) IS NOT NULL
     AND NOT public.date_matches_course_days(p_batch_date, v_batch.days_of_week) THEN
    RETURN QUERY SELECT false, 'This batch does not run on the selected day'::text, NULL::uuid; RETURN;
  END IF;

  -- Prevent duplicate booking
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE student_id = p_student_id
      AND batch_id = p_batch_id
      AND booking_date = p_batch_date
      AND status = 'confirmed'
  ) THEN
    RETURN QUERY SELECT false, 'You already have a booking for this batch on this date'::text, NULL::uuid; RETURN;
  END IF;

  -- Strict per-batch capacity
  SELECT COUNT(*) INTO v_count
  FROM public.bookings
  WHERE batch_id = p_batch_id
    AND booking_date = p_batch_date
    AND status = 'confirmed';

  IF v_count >= v_batch.total_seats THEN
    RETURN QUERY SELECT false, 'Slots Full - Try different slot'::text, NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.bookings (student_id, course_id, batch_id, booking_date, time_slot, status)
  VALUES (p_student_id, v_batch.course_id, p_batch_id, p_batch_date, v_batch.time_slot, 'confirmed')
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT true, 'Booked'::text, v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_batch_slot(uuid, uuid, date) TO authenticated;