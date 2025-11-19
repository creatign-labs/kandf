import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const Feedback = () => {
  const [rating, setRating] = useState("5");
  const [category, setCategory] = useState("course");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Feedback submitted!",
      description: "Thank you for helping us improve. Your feedback is valuable to us.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Share Your Feedback</h1>
            <p className="text-muted-foreground">
              Help us improve your learning experience. Your feedback matters!
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="p-6 border-border/60 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Feedback Form</h2>
                  <p className="text-sm text-muted-foreground">
                    All fields are required
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Feedback Category</Label>
                  <RadioGroup value={category} onValueChange={setCategory}>
                    <div className="space-y-2">
                      <Label
                        htmlFor="course"
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="course" id="course" />
                        <span>Course Content & Structure</span>
                      </Label>
                      <Label
                        htmlFor="instructor"
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="instructor" id="instructor" />
                        <span>Instructor Teaching Style</span>
                      </Label>
                      <Label
                        htmlFor="facilities"
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="facilities" id="facilities" />
                        <span>Facilities & Equipment</span>
                      </Label>
                      <Label
                        htmlFor="platform"
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="platform" id="platform" />
                        <span>Online Platform & Booking System</span>
                      </Label>
                      <Label
                        htmlFor="other"
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="other" id="other" />
                        <span>Other</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Overall Rating</Label>
                  <RadioGroup value={rating} onValueChange={setRating}>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Label
                          key={value}
                          htmlFor={`rating-${value}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div
                            className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                              rating === String(value)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem
                              value={String(value)}
                              id={`rating-${value}`}
                              className="sr-only"
                            />
                            <Star
                              className={`h-6 w-6 ${
                                rating === String(value)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Your Feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Please share your detailed feedback here. What did you like? What can we improve?"
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suggestions">Suggestions for Improvement</Label>
                  <Textarea
                    id="suggestions"
                    placeholder="Any specific suggestions or recommendations?"
                    rows={4}
                  />
                </div>
              </div>
            </Card>

            <Button type="submit" size="lg" className="w-full">
              Submit Feedback
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
