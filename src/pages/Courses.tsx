import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCourseImage } from "@/lib/courseImages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  duration: string;
  materials_count: number | null;
  level: string;
}

interface StudentOnboarding {
  goal: string;
  preferred_duration: string;
  recipe_interests: string[];
  skill_level: string;
}

const SKILL_TO_LEVEL_MAP: Record<string, string[]> = {
  beginner: ["Beginner"],
  home_baker: ["Beginner", "Intermediate"],
  intermediate: ["Intermediate"],
  advanced: ["Intermediate", "Advanced"],
};

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [onboarding, setOnboarding] = useState<StudentOnboarding | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCoursesAndOnboarding();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchTerm, courses, levelFilter, showRecommendedOnly, onboarding]);

  const loadCoursesAndOnboarding = async () => {
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('level', { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // If logged in, fetch onboarding data
      if (user) {
        const { data: onboardingData } = await supabase
          .from('student_onboarding')
          .select('*')
          .eq('student_id', user.id)
          .maybeSingle();

        if (onboardingData) {
          setOnboarding(onboardingData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isRecommendedCourse = (course: Course): boolean => {
    if (!onboarding) return false;
    
    const recommendedLevels = SKILL_TO_LEVEL_MAP[onboarding.skill_level] || [];
    return recommendedLevels.some(level => 
      course.level.toLowerCase().includes(level.toLowerCase())
    );
  };

  const filterCourses = () => {
    let filtered = [...courses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter(course =>
        course.level.toLowerCase() === levelFilter.toLowerCase()
      );
    }

    // Apply recommended only filter
    if (showRecommendedOnly && onboarding) {
      filtered = filtered.filter(isRecommendedCourse);
    }

    // Sort: recommended courses first
    if (onboarding && !showRecommendedOnly) {
      filtered.sort((a, b) => {
        const aRecommended = isRecommendedCourse(a);
        const bRecommended = isRecommendedCourse(b);
        if (aRecommended && !bRecommended) return -1;
        if (!aRecommended && bRecommended) return 1;
        return 0;
      });
    }

    setFilteredCourses(filtered);
  };

  const recommendedCourses = onboarding 
    ? filteredCourses.filter(isRecommendedCourse) 
    : [];
  const otherCourses = onboarding 
    ? filteredCourses.filter(c => !isRecommendedCourse(c)) 
    : filteredCourses;

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

          {/* Filters Section */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search courses..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              {onboarding && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="recommended-only"
                    checked={showRecommendedOnly}
                    onCheckedChange={setShowRecommendedOnly}
                  />
                  <Label htmlFor="recommended-only" className="text-sm cursor-pointer">
                    Recommended only
                  </Label>
                </div>
              )}
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <p className="text-center text-muted-foreground">No courses found</p>
          ) : (
            <div className="space-y-12">
              {/* Recommended Section */}
              {onboarding && recommendedCourses.length > 0 && !showRecommendedOnly && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Recommended for You</h2>
                    <Badge variant="secondary" className="ml-2">
                      Based on your preferences
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedCourses.map((course) => (
                      <div key={course.id} className="relative">
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge className="bg-primary text-primary-foreground">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Best Match
                          </Badge>
                        </div>
                        <CourseCard 
                          id={course.id}
                          title={course.title}
                          description={course.description}
                          image={getCourseImage(course.id, course.image_url || '', course.title)}
                          duration={course.duration}
                          materials={course.materials_count || 0}
                          enrolled={0}
                          level={course.level}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All/Other Courses Section */}
              {((onboarding && otherCourses.length > 0) || !onboarding) && (
                <div>
                  {onboarding && recommendedCourses.length > 0 && !showRecommendedOnly && (
                    <h2 className="text-2xl font-semibold mb-6">Other Courses</h2>
                  )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showRecommendedOnly ? filteredCourses : otherCourses).map((course) => (
                      <CourseCard 
                        key={course.id} 
                        id={course.id}
                        title={course.title}
                        description={course.description}
                        image={getCourseImage(course.id, course.image_url || '', course.title)}
                        duration={course.duration}
                        materials={course.materials_count || 0}
                        enrolled={0}
                        level={course.level}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-border/60 rounded-2xl p-8 text-center mt-12">
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
