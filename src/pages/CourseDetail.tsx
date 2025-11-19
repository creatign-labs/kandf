import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, BookOpen, ChefHat, Users, IndianRupee, CheckCircle2 } from "lucide-react";

const coursesData = {
  "course-a": {
    id: "course-a",
    title: "Course A: Foundation Baking",
    level: "Beginner",
    duration: "8 weeks",
    description: "Master the fundamentals of baking with our comprehensive foundation course. Perfect for beginners starting their baking journey.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    modules: [
      {
        title: "Module 1: Baking Basics",
        duration: "2 weeks",
        topics: ["Understanding ingredients", "Equipment essentials", "Measuring techniques", "Oven fundamentals"]
      },
      {
        title: "Module 2: Breads & Doughs",
        duration: "2 weeks",
        topics: ["Yeast breads", "Quick breads", "Focaccia", "Kneading techniques"]
      },
      {
        title: "Module 3: Basic Cakes",
        duration: "2 weeks",
        topics: ["Sponge cakes", "Pound cakes", "Basic frostings", "Cake assembly"]
      },
      {
        title: "Module 4: Cookies & Pastries",
        duration: "2 weeks",
        topics: ["Cookie varieties", "Shortcrust pastry", "Danish pastries", "Final assessment"]
      }
    ],
    sampleRecipes: [
      "Classic White Bread",
      "Chocolate Chip Cookies",
      "Vanilla Sponge Cake",
      "Butter Croissants",
      "Focaccia Bread",
      "Shortbread Cookies"
    ],
    batches: [
      { day: "Monday & Wednesday", time: "10:00 AM - 1:00 PM", slots: "8 students", status: "Open" },
      { day: "Tuesday & Thursday", time: "2:00 PM - 5:00 PM", slots: "8 students", status: "Open" },
      { day: "Saturday", time: "9:00 AM - 12:00 PM", slots: "10 students", status: "Filling Fast" }
    ],
    fees: {
      courseFee: 35000,
      materialsFee: 5000,
      registrationFee: 2000,
      total: 42000
    },
    highlights: [
      "16 hands-on classes",
      "Personal ingredient kit",
      "Certificate upon completion",
      "Lifetime recipe access",
      "Small batch sizes"
    ]
  },
  "course-b": {
    id: "course-b",
    title: "Course B: Advanced Artisan Baking",
    level: "Intermediate",
    duration: "12 weeks",
    description: "Elevate your skills with advanced techniques in artisan breads, laminated doughs, and specialty pastries.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
    modules: [
      {
        title: "Module 1: Artisan Breads",
        duration: "3 weeks",
        topics: ["Sourdough starters", "French baguettes", "Ciabatta", "Scoring techniques"]
      },
      {
        title: "Module 2: Laminated Doughs",
        duration: "3 weeks",
        topics: ["Croissants perfection", "Danish pastries", "Puff pastry", "Viennoiserie"]
      },
      {
        title: "Module 3: Advanced Cakes",
        duration: "3 weeks",
        topics: ["Layer cakes", "Mousse cakes", "Mirror glazes", "Entremet"]
      },
      {
        title: "Module 4: Specialty Desserts",
        duration: "3 weeks",
        topics: ["Tarts & flans", "Éclairs", "Macarons", "Final showcase"]
      }
    ],
    sampleRecipes: [
      "Sourdough Boule",
      "Classic Croissants",
      "French Macarons",
      "Opera Cake",
      "Fruit Tarts",
      "Chocolate Éclairs",
      "Puff Pastry",
      "Brioche"
    ],
    batches: [
      { day: "Monday, Wednesday & Friday", time: "9:00 AM - 1:00 PM", slots: "6 students", status: "Open" },
      { day: "Tuesday & Thursday", time: "1:00 PM - 5:00 PM", slots: "6 students", status: "Open" },
      { day: "Weekend (Sat & Sun)", time: "10:00 AM - 2:00 PM", slots: "8 students", status: "Filling Fast" }
    ],
    fees: {
      courseFee: 68000,
      materialsFee: 8000,
      registrationFee: 2000,
      total: 78000
    },
    highlights: [
      "36 intensive sessions",
      "Premium ingredient kit",
      "Industry certification",
      "Portfolio development",
      "Guest chef masterclasses"
    ]
  },
  "course-c": {
    id: "course-c",
    title: "Course C: Professional Pastry Chef Program",
    level: "Advanced",
    duration: "16 weeks",
    description: "Complete professional training covering all aspects of pastry arts, plated desserts, and entrepreneurship for aspiring pastry chefs.",
    image: "https://images.unsplash.com/photo-1464195643332-1f236b1c2255?w=800&q=80",
    modules: [
      {
        title: "Module 1: Professional Techniques",
        duration: "4 weeks",
        topics: ["Advanced tempering", "Sugar work", "Chocolate showpieces", "Precision baking"]
      },
      {
        title: "Module 2: Plated Desserts",
        duration: "4 weeks",
        topics: ["Restaurant desserts", "Plating techniques", "Flavor pairing", "Modern presentations"]
      },
      {
        title: "Module 3: Wedding & Celebration Cakes",
        duration: "4 weeks",
        topics: ["Multi-tier cakes", "Fondant work", "Cake decorating", "Custom designs"]
      },
      {
        title: "Module 4: Business & Entrepreneurship",
        duration: "4 weeks",
        topics: ["Bakery setup", "Costing & pricing", "Marketing", "Final certification project"]
      }
    ],
    sampleRecipes: [
      "Chocolate Showpiece",
      "Wedding Cake (3-tier)",
      "Plated Dessert Series",
      "Artisan Bread Collection",
      "Viennoiserie Selection",
      "Petit Fours",
      "Sugar Sculptures",
      "Entremet Collection",
      "Macaron Varieties",
      "Tart Assortment"
    ],
    batches: [
      { day: "Full-time (Mon-Fri)", time: "9:00 AM - 3:00 PM", slots: "6 students", status: "Open" },
      { day: "Weekend Intensive", time: "9:00 AM - 5:00 PM", slots: "6 students", status: "Limited Seats" }
    ],
    fees: {
      courseFee: 125000,
      materialsFee: 15000,
      registrationFee: 5000,
      total: 145000
    },
    highlights: [
      "64 comprehensive sessions",
      "Professional certification",
      "Industry internship placement",
      "Business setup guidance",
      "Lifetime mentorship",
      "Job placement assistance"
    ]
  }
};

export default function CourseDetail() {
  const { id } = useParams();
  const course = coursesData[id as keyof typeof coursesData];

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Course Not Found</h1>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-primary/10 to-accent/10">
        <img 
          src={course.image} 
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <Badge variant="secondary" className="w-fit mb-4">
            <BookOpen className="h-3 w-3 mr-1" />
            {course.level}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{course.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {course.modules.map((module, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-6 pb-4 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{module.title}</h3>
                        <p className="text-sm text-muted-foreground">{module.duration}</p>
                      </div>
                    </div>
                    <ul className="ml-11 space-y-1">
                      {module.topics.map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sample Recipes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Sample Recipes You'll Master
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {course.sampleRecipes.map((recipe, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{recipe}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Batch Timings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Available Batch Timings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.batches.map((batch, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{batch.day}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {batch.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {batch.slots}
                        </span>
                      </div>
                    </div>
                    <Badge variant={batch.status === "Open" ? "outline" : "default"}>
                      {batch.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Fees Breakdown */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Fees Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course Fee</span>
                    <span className="font-medium">₹{course.fees.courseFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materials Fee</span>
                    <span className="font-medium">₹{course.fees.materialsFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registration Fee</span>
                    <span className="font-medium">₹{course.fees.registrationFee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{course.fees.total.toLocaleString()}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" asChild>
                  <Link to="/login">Enroll Now</Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure your spot • Limited seats available
                </p>
              </CardContent>
            </Card>

            {/* Course Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {course.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{course.duration}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Batch Size</p>
                    <p className="text-muted-foreground">Small groups for personalized attention</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Level</p>
                    <p className="text-muted-foreground">{course.level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
