import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseCard } from "@/components/CourseCard";
import { Link } from "react-router-dom";
import { ChefHat, Award, Users, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCourseImage } from "@/lib/courseImages";

const stats = [
  { icon: Users, value: "500+", label: "Students Trained" },
  { icon: Award, value: "95%", label: "Placement Rate" },
  { icon: ChefHat, value: "15+", label: "Expert Chefs" },
  { icon: Clock, value: "200+", label: "Hours of Content" },
];

const Home = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedCourses();
  }, []);

  const loadFeaturedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('level', { ascending: true })
        .limit(3);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative px-4 md:px-6 py-12 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 md:px-4 py-1.5 md:py-2 mb-4 md:mb-6">
              <ChefHat className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium text-primary">World-Class Baking Education</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 md:mb-6">
              Master the Art of
              <span className="block text-primary mt-1 md:mt-2">Professional Baking</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
              Transform your passion into profession with our comprehensive baking programs. 
              Learn from industry experts, master essential techniques, and build a successful career.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Button size="lg" asChild className="shadow-lg w-full sm:w-auto">
                <Link to="/courses">Explore Courses</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/enquiry">Contact Admissions</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-card/50">
        <div className="container px-4 md:px-6 py-10 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex p-3 md:p-4 rounded-xl md:rounded-2xl bg-primary/10 mb-3 md:mb-4">
                  <stat.icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="container px-4 md:px-6 py-12 md:py-20">
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">Featured Programs</h2>
          <p className="text-muted-foreground text-sm md:text-lg">
            Choose from our comprehensive baking programs designed for all skill levels
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {loading ? (
            <p className="col-span-full text-center text-muted-foreground">Loading courses...</p>
          ) : (
            courses.map((course) => (
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
            ))
          )}
        </div>
        
        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link to="/courses">View All Courses</Link>
          </Button>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-4 md:px-6 py-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">Why Choose Knead & Frost?</h2>
            <p className="text-muted-foreground text-sm md:text-lg">
              We provide everything you need to succeed in your baking career
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <Card className="p-4 md:p-6 text-center border-border/60">
              <div className="inline-flex p-3 md:p-4 rounded-xl md:rounded-2xl bg-primary/10 mb-3 md:mb-4">
                <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Expert Instructors</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Learn from award-winning chefs with decades of industry experience
              </p>
            </Card>
            
            <Card className="p-4 md:p-6 text-center border-border/60">
              <div className="inline-flex p-3 md:p-4 rounded-xl md:rounded-2xl bg-primary/10 mb-3 md:mb-4">
                <Award className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Industry Certification</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Earn recognized certifications that open doors to top opportunities
              </p>
            </Card>
            
            <Card className="p-4 md:p-6 text-center border-border/60 sm:col-span-2 md:col-span-1">
              <div className="inline-flex p-3 md:p-4 rounded-xl md:rounded-2xl bg-primary/10 mb-3 md:mb-4">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Career Support</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Get personalized placement assistance and connect with hiring partners
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 md:px-6 py-12 md:py-20">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 md:p-12 border-0">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Ready to Start Your Journey?</h2>
            <p className="text-primary-foreground/90 text-sm md:text-lg mb-6 md:mb-8">
              Join hundreds of successful students who have transformed their passion into a thriving career
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                <Link to="/enquiry">Contact Admissions</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/courses">Browse Courses</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Home;
