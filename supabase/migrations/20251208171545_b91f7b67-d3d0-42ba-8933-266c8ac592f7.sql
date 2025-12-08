-- Add missing foreign key constraints (skip if already exists)
DO $$ 
BEGIN
  -- Attendance: link student_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_fkey') THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Bookings: link student_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_student_id_fkey') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Certificates: link student_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificates_student_id_fkey') THEN
    ALTER TABLE certificates ADD CONSTRAINT certificates_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Job Applications: link student_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_student_id_fkey') THEN
    ALTER TABLE job_applications ADD CONSTRAINT job_applications_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Payments: link student_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_student_id_fkey') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Notifications: link user_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- User Roles: link user_id to profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;