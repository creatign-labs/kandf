import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Clock, Target, Calendar, Bell } from "lucide-react";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="student" userName="Sarah Johnson" />
      
      <div className="container px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Good morning, Sarah 👋</h1>
          <p className="text-muted-foreground">Welcome to Knead & Frost, check your priority learning.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Points"
            value="100"
            icon={Target}
            variant="primary"
          />
          <StatsCard
            title="Badges"
            value="32"
            icon={Award}
            variant="success"
          />
          <StatsCard
            title="Learning Content"
            value="120"
            icon={BookOpen}
            variant="default"
          />
          <StatsCard
            title="Learning Time"
            value="44h"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Feature Discussion Banner */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-success/10 via-background to-background border-success/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge className="mb-3 bg-success text-success-foreground">New</Badge>
              <h3 className="font-semibold text-lg mb-2">Feature Discussion</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The learning content are a new feature in "Feature Discussion" can be explain the material problem chat.
              </p>
              <Button size="sm" variant="outline">
                Go to detail →
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* In Progress Courses */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">In progress learning content</h2>
                  <p className="text-sm text-muted-foreground">Continue where you left off</p>
                </div>
                <Button variant="link" asChild>
                  <Link to="/student/courses">View all</Link>
                </Button>
              </div>

              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex gap-4">
                    <div className="h-20 w-32 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Course
                      </Badge>
                      <h3 className="font-semibold mb-1">Mastering UI/UX Design: A Guide...</h3>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mt-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          5 Material
                        </span>
                        <span>Completion: -</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          1 Day
                        </span>
                      </div>
                    </div>
                    <Button>Start</Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex gap-4">
                    <div className="h-20 w-32 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-8 w-8 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Course
                      </Badge>
                      <h3 className="font-semibold mb-1">Creating Engaging Learning Jour...</h3>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mt-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          12 Material
                        </span>
                        <span className="text-success">Completion: 64%</span>
                        <span className="flex items-center gap-1 text-destructive">
                          <Clock className="h-4 w-4" />
                          12 hrs
                        </span>
                      </div>
                    </div>
                    <Button>Continue</Button>
                  </div>
                </Card>
              </div>
            </div>

            {/* New Enrollment */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">New enrollment</h2>
                <Button variant="link" asChild>
                  <Link to="/courses">View all</Link>
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <CourseCard
                  id="engage"
                  title="Enhancing Learning Engagement Through Thoughtful UI/UX"
                  description="Learn to create engaging learning experiences"
                  image="/placeholder.svg"
                  duration="10 materials"
                  materials={10}
                  level="Prototyping"
                />
                <CourseCard
                  id="ui101"
                  title="UI/UX 101 - For Beginner to be great and good Designer"
                  description="Master the fundamentals of UI/UX design"
                  image="/placeholder.svg"
                  duration="8 materials"
                  materials={8}
                  level="Prototyping"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Goals Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Goals</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="relative inline-flex mb-4">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted/20"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(6/30) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                        className="text-success"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">6/30</div>
                        <div className="text-xs text-muted-foreground">learning</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Daily Goal: 6/30 learning</div>
                    <div className="text-sm text-muted-foreground">
                      Your Longest streak: 1 Day<br />
                      <span className="text-xs">(28 Sep 23 - 4 Okt 23)</span>
                    </div>
                    <Button variant="link" size="sm" className="text-primary">
                      See Detail
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Leaderboard */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Leaderboard</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                View your ranking and compete with other students
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
