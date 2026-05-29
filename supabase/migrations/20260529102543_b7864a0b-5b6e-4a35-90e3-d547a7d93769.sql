UPDATE public.student_access_approvals a
SET advance_payment_id = ap.id
FROM (
  SELECT DISTINCT ON (student_id) id, student_id
  FROM public.advance_payments
  WHERE course_id IS NOT NULL
  ORDER BY student_id, created_at DESC
) ap
WHERE a.student_id = ap.student_id
  AND a.advance_payment_id IS NULL;