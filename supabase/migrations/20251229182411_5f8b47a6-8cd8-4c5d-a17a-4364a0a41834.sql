-- Create chef_specializations table to link chefs with recipes they specialize in
CREATE TABLE public.chef_specializations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chef_id UUID NOT NULL,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (chef_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.chef_specializations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage chef specializations"
ON public.chef_specializations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Chefs can view their own specializations"
ON public.chef_specializations
FOR SELECT
USING (auth.uid() = chef_id);

CREATE POLICY "Anyone can view chef specializations"
ON public.chef_specializations
FOR SELECT
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_chef_specializations_chef_id ON public.chef_specializations(chef_id);
CREATE INDEX idx_chef_specializations_recipe_id ON public.chef_specializations(recipe_id);