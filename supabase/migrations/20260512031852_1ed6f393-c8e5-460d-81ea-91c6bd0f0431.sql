-- Normalize blank strings to NULL so the unique index treats them as absent
UPDATE public.recipes SET recipe_code = NULL WHERE recipe_code IS NOT NULL AND btrim(recipe_code) = '';

-- Case-insensitive unique index on non-null recipe codes
CREATE UNIQUE INDEX IF NOT EXISTS recipes_recipe_code_unique_ci
  ON public.recipes (lower(btrim(recipe_code)))
  WHERE recipe_code IS NOT NULL;

-- Trigger to validate recipe_code on insert/update
CREATE OR REPLACE FUNCTION public.validate_recipe_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recipe_code IS NOT NULL THEN
    NEW.recipe_code := btrim(NEW.recipe_code);
    IF NEW.recipe_code = '' THEN
      RAISE EXCEPTION 'Recipe code cannot be empty' USING ERRCODE = '23514';
    END IF;
    IF length(NEW.recipe_code) > 30 THEN
      RAISE EXCEPTION 'Recipe code must be 30 characters or less' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_recipe_code_trigger ON public.recipes;
CREATE TRIGGER validate_recipe_code_trigger
  BEFORE INSERT OR UPDATE OF recipe_code ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recipe_code();