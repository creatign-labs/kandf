-- Fix profiles RLS policy (protect phone numbers)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create missing decrement_batch_seats function
CREATE OR REPLACE FUNCTION public.decrement_batch_seats(batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE batches
  SET available_seats = GREATEST(available_seats - 1, 0),
      updated_at = now()
  WHERE id = batch_id
    AND available_seats > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found or no seats available';
  END IF;
END;
$$;

-- Seed courses
INSERT INTO courses (id, title, description, duration, level, base_fee, materials_count, image_url) VALUES
('a1111111-1111-1111-1111-111111111111', 'Course A: Foundation Baking', 'Master the fundamentals of baking with our comprehensive foundation course. Perfect for beginners.', '3 months', 'Beginner', 25000, 24, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop'),
('b2222222-2222-2222-2222-222222222222', 'Course B: Advanced Pastry', 'Elevate your skills with advanced techniques in pastry and cake decoration.', '4 months', 'Intermediate', 35000, 32, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
('c3333333-3333-3333-3333-333333333333', 'Course C: Professional Mastery', 'Complete professional training with business skills and placement support.', '6 months', 'Advanced', 50000, 48, 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&h=300&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Seed batches for each course
INSERT INTO batches (id, course_id, batch_name, days, time_slot, start_date, total_seats, available_seats) VALUES
-- Course A batches
('a1111111-1111-1111-1111-111111111101', 'a1111111-1111-1111-1111-111111111111', 'Morning Batch', 'Mon, Wed, Fri', '9:00 AM - 12:00 PM', '2025-12-01', 20, 20),
('a1111111-1111-1111-1111-111111111102', 'a1111111-1111-1111-1111-111111111111', 'Evening Batch', 'Tue, Thu, Sat', '2:00 PM - 5:00 PM', '2025-12-01', 20, 20),
('a1111111-1111-1111-1111-111111111103', 'a1111111-1111-1111-1111-111111111111', 'Weekend Batch', 'Sat, Sun', '10:00 AM - 4:00 PM', '2025-12-07', 15, 15),
-- Course B batches
('b2222222-2222-2222-2222-222222222201', 'b2222222-2222-2222-2222-222222222222', 'Morning Batch', 'Mon, Wed, Fri', '9:00 AM - 1:00 PM', '2025-12-01', 15, 15),
('b2222222-2222-2222-2222-222222222202', 'b2222222-2222-2222-2222-222222222222', 'Afternoon Batch', 'Tue, Thu, Sat', '2:00 PM - 6:00 PM', '2025-12-01', 15, 15),
-- Course C batches
('c3333333-3333-3333-3333-333333333301', 'c3333333-3333-3333-3333-333333333333', 'Full-time Batch', 'Mon-Fri', '9:00 AM - 5:00 PM', '2026-01-05', 12, 12),
('c3333333-3333-3333-3333-333333333302', 'c3333333-3333-3333-3333-333333333333', 'Weekend Intensive', 'Sat, Sun', '9:00 AM - 5:00 PM', '2026-01-11', 10, 10)
ON CONFLICT (id) DO NOTHING;