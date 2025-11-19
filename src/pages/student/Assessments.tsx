import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle, Lock } from "lucide-react";

const assessments = [
  {
    id: 1,
    module: "Module 1: Baking Fundamentals",
    title: "Foundation Knowledge Test",
    status: "completed",
    score: 92,
    questions: 20,
    duration: "30 mins",
    completedDate: "Jan 15, 2025",
  },
  {
    id: 2,
    module: "Module 2: Pastry Techniques",
    title: "Pastry Skills Assessment",
    status: "available",
    score: null,
    questions: 25,
    duration: "45 mins",
    completedDate: null,
  },
  {
    id: 3,
    module: "Module 3: Cake Decoration",
    title: "Decoration Mastery Exam",
    status: "locked",
    score: null,
    questions: 30,
    duration: "60 mins",
    completedDate: null,
  },
];

const Assessments = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Assessments</h1>
            <p className="text-muted-foreground">Test your knowledge and track your progress</p>
          </div>

          <Card className="p-6 border-border/60 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Course Completion</span>
                <span className="font-semibold">53%</span>
              </div>
              <Progress value={53} className="h-2" />
              <p className="text-sm text-muted-foreground">
                1 of 3 assessments completed • Keep learning to unlock more!
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="p-6 border-border/60">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {assessment.module}
                    </p>
                    <h3 className="text-xl font-semibold mb-2">{assessment.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {assessment.questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {assessment.duration}
                      </span>
                    </div>
                  </div>
                  <div>
                    {assessment.status === "completed" && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                    {assessment.status === "available" && (
                      <Badge variant="secondary">Available</Badge>
                    )}
                    {assessment.status === "locked" && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>

                {assessment.status === "completed" && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Your Score: {assessment.score}%
                        </p>
                        <p className="text-xs text-green-700">
                          Completed on {assessment.completedDate}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                )}

                {assessment.status === "available" && (
                  <Button size="lg" className="w-full">
                    Start Assessment
                  </Button>
                )}

                {assessment.status === "locked" && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      Complete previous modules to unlock this assessment
                    </p>
                  </div>
                )}

                {assessment.status === "completed" && (
                  <Button variant="outline" className="w-full mt-2">
                    View Results
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessments;
