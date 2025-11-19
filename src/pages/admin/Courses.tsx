import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit, Clock, Users, DollarSign } from "lucide-react";

const Courses = () => {
  const courses = [
    {
      id: "A",
      name: "Basic Baking Fundamentals",
      duration: "3 months",
      fee: "$1,200",
      students: 28,
      batches: ["Morning (9-12)", "Afternoon (2-5)", "Evening (6-9)"],
      modules: [
        {
          name: "Module 1: Introduction to Baking",
          recipes: ["Basic Bread", "Simple Cookies", "Muffins"],
        },
        {
          name: "Module 2: Working with Dough",
          recipes: ["Pizza Dough", "Focaccia", "Dinner Rolls"],
        },
        {
          name: "Module 3: Sweet Treats",
          recipes: ["Brownies", "Cupcakes", "Basic Cake"],
        },
      ],
    },
    {
      id: "B",
      name: "Advanced Pastry & Desserts",
      duration: "4 months",
      fee: "$1,800",
      students: 22,
      batches: ["Morning (9-12)", "Evening (6-9)"],
      modules: [
        {
          name: "Module 1: French Pastry Basics",
          recipes: ["Croissants", "Pain au Chocolat", "Éclairs"],
        },
        {
          name: "Module 2: Advanced Techniques",
          recipes: ["Macarons", "Tarts", "Profiteroles"],
        },
        {
          name: "Module 3: Chocolate Work",
          recipes: ["Chocolate Mousse", "Ganache", "Truffles"],
        },
        {
          name: "Module 4: Plated Desserts",
          recipes: ["Tiramisu", "Panna Cotta", "Crème Brûlée"],
        },
      ],
    },
    {
      id: "C",
      name: "Professional Chef Certification",
      duration: "6 months",
      fee: "$2,500",
      students: 15,
      batches: ["Morning (9-12)"],
      modules: [
        {
          name: "Module 1: Advanced Baking",
          recipes: ["Artisan Bread", "Sourdough", "Laminated Dough"],
        },
        {
          name: "Module 2: Pastry Excellence",
          recipes: ["Opera Cake", "St. Honoré", "Mille-feuille"],
        },
        {
          name: "Module 3: Chocolate Mastery",
          recipes: ["Tempering", "Bonbons", "Showpieces"],
        },
        {
          name: "Module 4: Restaurant Standards",
          recipes: ["Plating", "Menu Development", "Cost Control"],
        },
        {
          name: "Module 5: Business & Operations",
          recipes: ["Kitchen Management", "Food Safety", "Marketing"],
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Course Management</h1>
            <p className="text-muted-foreground">Create and manage course curriculum, modules, and pricing</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Course
          </Button>
        </div>

        <div className="space-y-6">
          {courses.map((course) => (
            <Card key={course.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="text-lg px-3 py-1">Course {course.id}</Badge>
                    <h2 className="text-2xl font-bold text-foreground">{course.name}</h2>
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {course.fee}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {course.students} enrolled
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Course
                </Button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Available Batches</h3>
                <div className="flex flex-wrap gap-2">
                  {course.batches.map((batch, index) => (
                    <Badge key={index} variant="outline">
                      {batch}
                    </Badge>
                  ))}
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="modules">
                  <AccordionTrigger className="text-lg font-semibold">
                    Course Modules & Recipes ({course.modules.length} modules)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {course.modules.map((module, index) => (
                        <div key={index} className="border-l-2 border-primary pl-4">
                          <h4 className="font-semibold text-foreground mb-2">{module.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.recipes.map((recipe, recipeIndex) => (
                              <Badge key={recipeIndex} variant="secondary">
                                {recipe}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Course Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="text-sm text-muted-foreground">Total Courses</div>
              <div className="text-2xl font-bold">3</div>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <div className="text-sm text-muted-foreground">Total Students</div>
              <div className="text-2xl font-bold">65</div>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="text-sm text-muted-foreground">Active Batches</div>
              <div className="text-2xl font-bold">7</div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Courses;
