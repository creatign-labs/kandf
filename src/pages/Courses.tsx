import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const courses = [
  {
    id: "A",
    title: "Course A: Foundation Baking",
    description: "Master the fundamentals of baking with our comprehensive foundation course. Perfect for beginners.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    duration: "3 months",
    materials: 24,
    enrolled: 156,
    level: "Beginner",
  },
  {
    id: "B",
    title: "Course B: Advanced Pastry",
    description: "Elevate your skills with advanced techniques in pastry and cake decoration.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    duration: "4 months",
    materials: 32,
    enrolled: 98,
    level: "Intermediate",
  },
  {
    id: "C",
    title: "Course C: Professional Mastery",
    description: "Complete professional training with business skills and placement support.",
    image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&h=300&fit=crop",
    duration: "6 months",
    materials: 48,
    enrolled: 67,
    level: "Advanced",
  },
];

const Courses = () => {
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
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {courses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>

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
