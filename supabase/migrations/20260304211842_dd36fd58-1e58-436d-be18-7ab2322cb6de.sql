
-- Table to track online class access per student
CREATE TABLE public.student_online_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_by uuid REFERENCES public.profiles(id),
  enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

-- Table to track which specific recipes are enabled for online viewing per student
CREATE TABLE public.student_online_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  enabled_by uuid REFERENCES public.profiles(id),
  enabled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.student_online_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_online_recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_online_access
CREATE POLICY "Admins can manage online access"
  ON public.student_online_access FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can read own online access"
  ON public.student_online_access FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- RLS policies for student_online_recipes
CREATE POLICY "Admins can manage online recipes"
  ON public.student_online_recipes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can read own online recipes"
  ON public.student_online_recipes FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
