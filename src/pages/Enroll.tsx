import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Users } from "lucide-react";
import { useState } from "react";

const courseData: Record<string, any> = {
  A: {
    title: "Course A: Foundation Baking",
    duration: "3 months",
    batches: [
      { id: "A1", time: "9:00 AM - 12:00 PM", days: "Mon, Wed, Fri", available: 8 },
      { id: "A2", time: "2:00 PM - 5:00 PM", days: "Tue, Thu, Sat", available: 12 },
    ],
    fee: 24999,
  },
  B: {
    title: "Course B: Advanced Pastry",
    duration: "4 months",
    batches: [
      { id: "B1", time: "10:00 AM - 1:00 PM", days: "Mon, Wed, Fri", available: 5 },
      { id: "B2", time: "3:00 PM - 6:00 PM", days: "Tue, Thu, Sat", available: 15 },
    ],
    fee: 34999,
  },
  C: {
    title: "Course C: Professional Mastery",
    duration: "6 months",
    batches: [
      { id: "C1", time: "9:00 AM - 1:00 PM", days: "Mon-Thu", available: 3 },
      { id: "C2", time: "2:00 PM - 6:00 PM", days: "Mon-Thu", available: 10 },
    ],
    fee: 49999,
  },
};

const Enroll = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedBatch, setSelectedBatch] = useState("");
  
  const course = courseData[id?.toUpperCase() || "A"];

  const handleProceed = () => {
    if (!selectedBatch) {
      return;
    }
    navigate("/payment", { 
      state: { 
        course: course.title, 
        batch: selectedBatch, 
        fee: course.fee 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Enroll in {course.title}</h1>
            <p className="text-muted-foreground">Select your preferred batch and complete enrollment</p>
          </div>

          <div className="grid gap-6">
            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Select Your Batch</h2>
                  <p className="text-sm text-muted-foreground">Choose a schedule that works for you</p>
                </div>
              </div>

              <RadioGroup value={selectedBatch} onValueChange={setSelectedBatch}>
                <div className="space-y-4">
                  {course.batches.map((batch: any) => (
                    <Label
                      key={batch.id}
                      htmlFor={batch.id}
                      className="flex items-center gap-4 p-4 border border-border rounded-xl cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <RadioGroupItem value={batch.id} id={batch.id} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Batch {batch.id}</span>
                          <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
                            {batch.available} seats left
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {batch.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {batch.days}
                          </span>
                        </div>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </Card>

            <Card className="p-6 border-border/60">
              <h3 className="font-semibold mb-4">Enrollment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{course.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Batch</span>
                  <span className="font-medium">{selectedBatch || "Not selected"}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-semibold">Total Fee</span>
                  <span className="font-bold text-primary">₹{course.fee.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Button 
              size="lg" 
              className="w-full"
              disabled={!selectedBatch}
              onClick={handleProceed}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enroll;
