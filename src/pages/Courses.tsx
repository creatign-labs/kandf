import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCourseImage } from "@/lib/courseImages";

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  duration: string;
  materials_count: number | null;
  level: string;
}

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredCourses(
        courses.filter(course =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredCourses(courses);
    }
  }, [searchTerm, courses]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
      setFilteredCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="container px-6 py-12">
          <p className="text-center">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Courses</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our carefully designed curriculum to match your skill level and career goals
            </p>
          </div>

          <div className="mb-8 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search courses..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <p className="text-center text-muted-foreground">No courses found</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredCourses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  image={getCourseImage(course.id, course.image_url || '')}
                  duration={course.duration}
                  materials={course.materials_count || 0}
                  enrolled={0}
                  level={course.level}
                />
              ))}
            </div>
          )}

          <div className="bg-card border border-border/60 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Not sure which course to choose?</h2>
            <p className="text-muted-foreground mb-6">
              Our counselors can help you find the perfect course based on your experience and goals
            </p>
            <Button size="lg">Schedule a Counseling Session</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courses;
