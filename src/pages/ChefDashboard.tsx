import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, CheckCircle2, Clock } from "lucide-react";

const ChefDashboard = () => {
  const todaysClasses = [
    {
      time: "09:00 AM - 11:00 AM",
      course: "Course A - Artisan Bread Basics",
      module: "Module 3: Sourdough Fundamentals",
      students: [
        { id: "A1", name: "Emma Wilson", attended: false },
        { id: "A2", name: "Oliver Brown", attended: false },
        { id: "A3", name: "Sophia Lee", attended: true },
        { id: "A4", name: "Lucas Martin", attended: false },
        { id: "A5", name: "Mia Davis", attended: false },
      ],
      status: "upcoming",
    },
    {
      time: "02:00 PM - 04:00 PM",
      course: "Course B - Advanced Pastry",
      module: "Module 5: French Pastries",
      students: [
        { id: "B1", name: "Isabella Garcia", attended: true },
        { id: "B2", name: "Ethan Rodriguez", attended: true },
        { id: "B3", name: "Ava Martinez", attended: true },
        { id: "B4", name: "Noah Anderson", attended: false },
      ],
      status: "in-progress",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" userName="Chef Marie" />
      
      <div className="container px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Good morning, Chef Marie 👨‍🍳</h1>
          <p className="text-muted-foreground">Manage your classes and track student attendance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Today's Classes"
            value="3"
            icon={Calendar}
            variant="primary"
          />
          <StatsCard
            title="Total Students"
            value="24"
            icon={Users}
            variant="success"
          />
          <StatsCard
            title="Completed Classes"
            value="1"
            icon={CheckCircle2}
            variant="default"
          />
          <StatsCard
            title="Upcoming"
            value="2"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Classes Schedule */}
        <div className="space-y-6">
          {todaysClasses.map((classItem, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={
                      classItem.status === "upcoming" ? "outline" :
                      classItem.status === "in-progress" ? "default" :
                      "secondary"
                    }>
                      {classItem.status === "upcoming" ? "Upcoming" :
                       classItem.status === "in-progress" ? "In Progress" :
                       "Completed"}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">{classItem.time}</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-1">{classItem.course}</h2>
                  <p className="text-sm text-muted-foreground">{classItem.module}</p>
                </div>
                
                {classItem.status === "in-progress" && (
                  <Button>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                {classItem.status === "upcoming" && (
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Start Class
                  </Button>
                )}
              </div>

              {/* Student Roster */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Student Roster ({classItem.students.length})</h3>
                  <span className="text-sm text-muted-foreground">
                    Present: {classItem.students.filter(s => s.attended).length}/{classItem.students.length}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-3">
                  {classItem.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        checked={student.attended}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {student.id}
                          </Badge>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </div>
                      {student.attended && (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recipe & Ingredients Card */}
        <Card className="p-6 mt-8">
          <h3 className="font-semibold mb-4">Today's Recipes & Ingredients</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Sourdough Fundamentals</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Bread flour (per student)</span>
                  <span className="font-medium">500g</span>
                </li>
                <li className="flex justify-between">
                  <span>Sourdough starter</span>
                  <span className="font-medium">100g</span>
                </li>
                <li className="flex justify-between">
                  <span>Water</span>
                  <span className="font-medium">350ml</span>
                </li>
                <li className="flex justify-between">
                  <span>Salt</span>
                  <span className="font-medium">10g</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">French Pastries</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Puff pastry (per student)</span>
                  <span className="font-medium">300g</span>
                </li>
                <li className="flex justify-between">
                  <span>Butter (unsalted)</span>
                  <span className="font-medium">150g</span>
                </li>
                <li className="flex justify-between">
                  <span>Eggs</span>
                  <span className="font-medium">3 units</span>
                </li>
                <li className="flex justify-between">
                  <span>Sugar</span>
                  <span className="font-medium">100g</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChefDashboard;
