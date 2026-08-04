ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_schedules
  ADD CONSTRAINT payment_schedules_student_id_profiles_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_schedules
  ADD CONSTRAINT payment_schedules_enrollment_id_fkey
  FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;