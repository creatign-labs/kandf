ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE public.inventory ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.courses ALTER COLUMN description DROP NOT NULL;