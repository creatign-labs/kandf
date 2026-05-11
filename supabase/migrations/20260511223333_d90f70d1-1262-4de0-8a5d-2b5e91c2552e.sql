DO $$
DECLARE
  v_advanced uuid;
  v_professional uuid;
BEGIN
  SELECT id INTO v_advanced FROM courses WHERE title = 'Advanced Pastry Arts' LIMIT 1;
  SELECT id INTO v_professional FROM courses WHERE title = 'Professional Mastery' LIMIT 1;

  -- Move to Advanced Pastry Arts
  UPDATE recipes SET course_id = v_advanced, updated_at = now()
  WHERE title IN (
    'French Macarons','Laminated Puff Pastry','Flavoured Danish',
    'Tres Leches Rasamalai','Tres Leches Vanilla','Mango Tiramisu',
    'Classic Tiramisu','Sour Dough','New York Cheese Cake',
    'Basque Cheese Cake','Coconut Pannacotta','Classic Ice Cream','Quiche'
  );

  -- Move to Professional Mastery
  UPDATE recipes SET course_id = v_professional, updated_at = now()
  WHERE title IN (
    'Engagement Theme Cake','Themed Cake','Fondant Toys','Sugar Flowers',
    'Red Velvet Cake','Choco Truffle Cake'
  );
END $$;