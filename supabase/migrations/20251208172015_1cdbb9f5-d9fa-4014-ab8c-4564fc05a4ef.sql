-- Create modules table for course structure and progress tracking
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_recipe_progress table to track which recipes are completed
CREATE TABLE public.student_recipe_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, recipe_id)
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions_count INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  passing_score INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_assessments table for tracking assessment attempts
CREATE TABLE public.student_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resumes table
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  resume_url TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  summary TEXT,
  education TEXT,
  experience TEXT,
  skills TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add module_id to recipes table
ALTER TABLE recipes ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_recipe_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules
CREATE POLICY "Anyone can view modules" ON modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON modules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for student_recipe_progress
CREATE POLICY "Students can view own progress" ON student_recipe_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update own progress" ON student_recipe_progress FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own progress" ON student_recipe_progress FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can manage all progress" ON student_recipe_progress FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for assessments
CREATE POLICY "Anyone can view assessments" ON assessments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessments" ON assessments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for student_assessments
CREATE POLICY "Students can view own assessments" ON student_assessments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own assessments" ON student_assessments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own assessments" ON student_assessments FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Admins can view all student assessments" ON student_assessments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for feedback
CREATE POLICY "Students can create feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own feedback" ON feedback FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins can view all feedback" ON feedback FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for resumes
CREATE POLICY "Students can manage own resume" ON resumes FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Admins can view all resumes" ON resumes FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes bucket
CREATE POLICY "Students can upload own resume" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own resume" ON storage.objects FOR SELECT 
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can update own resume" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can delete own resume" ON storage.objects FOR DELETE 
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all resumes" ON storage.objects FOR SELECT 
  USING (bucket_id = 'resumes' AND has_role(auth.uid(), 'admin'));