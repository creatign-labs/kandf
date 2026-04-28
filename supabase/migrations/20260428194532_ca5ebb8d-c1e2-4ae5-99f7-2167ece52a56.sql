
-- Helper expression repeated: (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))

-- ============ WRITE policies (FOR ALL) ============

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins and super admins can manage courses" ON public.courses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins and super admins can manage recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage batches" ON public.batches;
CREATE POLICY "Admins and super admins can manage batches" ON public.batches
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins and super admins can manage modules" ON public.modules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;
CREATE POLICY "Admins and super admins can manage inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage inventory usage" ON public.inventory_usage;
CREATE POLICY "Admins and super admins can manage inventory usage" ON public.inventory_usage
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admins and super admins can manage all attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage certificates" ON public.certificates;
CREATE POLICY "Admins and super admins can manage certificates" ON public.certificates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins and super admins can manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage applications" ON public.job_applications;
CREATE POLICY "Admins and super admins can manage applications" ON public.job_applications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Admins and super admins can manage leads" ON public.leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "Super admins can manage leads" ON public.leads;

DROP POLICY IF EXISTS "Admins can manage assessments" ON public.assessments;
CREATE POLICY "Admins and super admins can manage assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins and super admins can manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage all answers" ON public.student_answers;
CREATE POLICY "Admins and super admins can manage all answers" ON public.student_answers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage all progress" ON public.student_recipe_progress;
CREATE POLICY "Admins and super admins can manage all progress" ON public.student_recipe_progress
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins and super admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can update own checklists" ON public.inventory_checklists;
CREATE POLICY "Admins and super admins can update unapproved checklists" ON public.inventory_checklists
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) AND status <> 'approved')
  WITH CHECK ((has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) AND status <> 'approved');

-- ============ READ policies (FOR SELECT) ============

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins and super admins can view all bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all status logs" ON public.enrollment_status_logs;
CREATE POLICY "Admins and super admins can view all status logs" ON public.enrollment_status_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins and super admins can view all enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins and super admins can view all feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view financial ledger" ON public.financial_ledger;
CREATE POLICY "Admins and super admins can view financial ledger" ON public.financial_ledger
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins and super admins can view all payments" ON public.payments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins and super admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all resumes" ON public.resumes;
CREATE POLICY "Admins and super admins can view all resumes" ON public.resumes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view permissions" ON public.staff_permissions;
CREATE POLICY "Admins and super admins can view permissions" ON public.staff_permissions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view access approvals" ON public.student_access_approvals;
CREATE POLICY "Admins and super admins can view access approvals" ON public.student_access_approvals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all student assessments" ON public.student_assessments;
CREATE POLICY "Admins and super admins can view all student assessments" ON public.student_assessments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view vendor approvals" ON public.vendor_access_approvals;
CREATE POLICY "Admins and super admins can view vendor approvals" ON public.vendor_access_approvals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
