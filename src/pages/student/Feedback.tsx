import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Star, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Feedback = () => {
  const [rating, setRating] = useState("5");
  const [category, setCategory] = useState("course");
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const queryClient = useQueryClient();

  const { data: recentFeedback, isLoading } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feedback')
        .insert({
          student_id: user.id,
          category,
          rating: parseInt(rating),
          feedback_text: feedbackText,
          suggestions: suggestions || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted!",
        description: "Thank you for helping us improve. Your feedback is valuable to us.",
      });
      setFeedbackText("");
      setSuggestions("");
      setRating("5");
      setCategory("course");
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast({
        title: "Feedback required",
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      course: "Course Content",
      instructor: "Instructor",
      facilities: "Facilities",
      platform: "Platform",
      other: "Other"
    };
    return labels[cat] || cat;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

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
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suggestions">Suggestions for Improvement</Label>
                  <Textarea
                    id="suggestions"
                    placeholder="Any specific suggestions or recommendations?"
                    rows={4}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>

          {/* Google Review Section */}
          <Card className="p-6 border-border/60 mt-6 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Love learning with us?</h3>
                <p className="text-sm text-muted-foreground">
                  Share your experience with others by leaving a Google Review!
                </p>
              </div>
              <Button variant="outline" asChild>
                <a 
                  href="https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Leave a Review
                </a>
              </Button>
            </div>
          </Card>

          {recentFeedback && recentFeedback.length > 0 && (
            <Card className="p-6 border-border/60 mt-8">
              <h3 className="font-semibold mb-4">Your Recent Feedback</h3>
              <div className="space-y-4">
                {recentFeedback.map((fb) => (
                  <div key={fb.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{getCategoryLabel(fb.category)}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(fb.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{fb.feedback_text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Submitted {new Date(fb.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;