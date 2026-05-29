UPDATE public.profiles
SET enrollment_status = 'enrolled', updated_at = now()
WHERE enrollment_status = 'active'
  AND id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.student_access_approvals sa ON sa.student_id = p.id AND sa.status = 'approved'
    LEFT JOIN public.enrollments e ON e.student_id = p.id AND e.status = 'active'
    WHERE e.id IS NULL
  );

UPDATE public.student_access_approvals
SET status = 'pending', approved_by = NULL, approved_at = NULL, updated_at = now()
WHERE status = 'approved'
  AND student_id IN (
    SELECT sa.student_id FROM public.student_access_approvals sa
    LEFT JOIN public.enrollments e ON e.student_id = sa.student_id AND e.status = 'active'
    WHERE sa.status = 'approved' AND e.id IS NULL
  );