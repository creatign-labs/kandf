import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { BookOpen, Clock, CheckCircle, Lock } from "lucide-react";

const modules = [
  {
    id: 1,
    title: "Module 1: Baking Fundamentals",
    status: "completed",
    progress: 100,
    recipes: [
      { id: 1, name: "Basic White Bread", status: "completed" },
      { id: 2, name: "Chocolate Chip Cookies", status: "completed" },
      { id: 3, name: "Vanilla Sponge Cake", status: "completed" },
    ],
  },
  {
    id: 2,
    title: "Module 2: Pastry Techniques",
    status: "in-progress",
    progress: 60,
    recipes: [
      { id: 4, name: "Croissants", status: "completed" },
      { id: 5, name: "Danish Pastries", status: "in-progress" },
      { id: 6, name: "Puff Pastry Tarts", status: "locked" },
    ],
  },
  {
    id: 3,
    title: "Module 3: Cake Decoration",
    status: "locked",
    progress: 0,
    recipes: [
      { id: 7, name: "Buttercream Techniques", status: "locked" },
      { id: 8, name: "Fondant Basics", status: "locked" },
      { id: 9, name: "Royal Icing", status: "locked" },
    ],
  },
];

const MyCourse = () => {
  const overallProgress = 53;

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Course A: Foundation Baking</h1>
            <p className="text-muted-foreground">Your progress through the comprehensive baking course</p>
          </div>

          <Card className="p-6 border-border/60 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overall Progress</h2>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              13 of 24 recipes completed • Keep up the great work!
            </p>
          </Card>

          <div className="space-y-6">
            {modules.map((module) => (
              <Card key={module.id} className="p-6 border-border/60">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{module.title}</h3>
                      <Badge
                        variant={
                          module.status === "completed"
                            ? "default"
                            : module.status === "in-progress"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {module.status === "completed" && "Completed"}
                        {module.status === "in-progress" && "In Progress"}
                        {module.status === "locked" && "Locked"}
                      </Badge>
                    </div>
                    {module.status !== "locked" && (
                      <div>
                        <Progress value={module.progress} className="h-2 mb-1" />
                        <p className="text-sm text-muted-foreground">
                          {module.progress}% complete
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {module.recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {recipe.status === "completed" && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {recipe.status === "in-progress" && (
                          <Clock className="h-5 w-5 text-primary" />
                        )}
                        {recipe.status === "locked" && (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className={recipe.status === "locked" ? "text-muted-foreground" : ""}>
                          {recipe.name}
                        </span>
                      </div>
                      {recipe.status !== "locked" && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/student/recipes/${recipe.id}`}>
                            <BookOpen className="h-4 w-4" />
                            View Recipe
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCourse;
