-- Add policy for super_admins to manage all roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Also add a policy for super_admins to view all profiles (needed for the management page)
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));