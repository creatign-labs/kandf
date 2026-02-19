import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Star, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Feedback = () => {
  const [rating, setRating] = useState("5");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const queryClient = useQueryClient();

  // Fetch completed batches (past bookings with attendance)
  const { data: completedBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['completed-batches-for-feedback'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get bookings that are in the past and attended
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          time_slot,
          recipe_id,
          assigned_chef_id,
          course_id,
          recipes (title),
          courses (title)
        `)
        .eq('student_id', user.id)
        .eq('status', 'confirmed')
        .lt('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: false });

      if (!bookings) return [];

      // Get existing feedback to filter out already reviewed batches
      const { data: existingFeedback } = await supabase
        .from('feedback')
        .select('batch_id')
        .eq('student_id', user.id)
        .not('batch_id', 'is', null);

      const reviewedBatchIds = new Set(existingFeedback?.map(f => f.batch_id) || []);

      // Get batch info for each booking
      const { data: memberships } = await supabase
        .from('recipe_batch_memberships')
        .select('booking_id, recipe_batch_id, recipe_batches(id, batch_date, time_slot)')
        .eq('student_id', user.id);

      const bookingToBatch: Record<string, string> = {};
      memberships?.forEach(m => {
        if (m.booking_id && m.recipe_batch_id) {
          bookingToBatch[m.booking_id] = m.recipe_batch_id;
        }
      });

      // Filter: only show batches not yet reviewed  
      // Use enrollment batch_id from the booking's course batches
      return bookings
        .filter(b => {
          // We use the booking ID as the batch identifier for feedback linking
          return !reviewedBatchIds.has(b.id);
        })
        .map(b => ({
          bookingId: b.id,
          date: b.booking_date,
          timeSlot: b.time_slot,
          recipeName: (b.recipes as any)?.title || 'Unknown Recipe',
          courseName: (b.courses as any)?.title || 'Unknown Course',
          chefId: b.assigned_chef_id,
        }));
    }
  });

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

      if (!selectedBatchId) throw new Error('Please select a batch');

      const selectedBatch = completedBatches?.find(b => b.bookingId === selectedBatchId);

      const { error } = await supabase
        .from('feedback')
        .insert({
          student_id: user.id,
          category: 'batch',
          rating: parseInt(rating),
          feedback_text: feedbackText,
          suggestions: suggestions || null,
          batch_id: selectedBatchId,
          chef_id: selectedBatch?.chefId || null,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already submitted feedback for this batch');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted!",
        description: "Thank you for your feedback. It cannot be edited after submission.",
      });
      setFeedbackText("");
      setSuggestions("");
      setRating("5");
      setSelectedBatchId("");
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['completed-batches-for-feedback'] });
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
      toast({ title: "Feedback required", description: "Please enter your feedback.", variant: "destructive" });
      return;
    }
    if (!selectedBatchId) {
      toast({ title: "Batch required", description: "Please select a batch to review.", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  if (isLoading || batchesLoading) {
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
            <h1 className="text-3xl font-bold mb-2">Batch Feedback</h1>
            <p className="text-muted-foreground">
              Submit feedback for completed sessions. One feedback per batch, cannot be edited after submission.
            </p>
          </div>

          {completedBatches && completedBatches.length > 0 ? (
            <form onSubmit={handleSubmit}>
              <Card className="p-6 border-border/60 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Feedback Form</h2>
                    <p className="text-sm text-muted-foreground">Select a completed batch to review</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select Batch</Label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a batch to review" />
                      </SelectTrigger>
                      <SelectContent>
                        {completedBatches.map((batch) => (
                          <SelectItem key={batch.bookingId} value={batch.bookingId}>
                            {batch.recipeName} — {new Date(batch.date).toLocaleDateString()} ({batch.timeSlot})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Rating (1–5)</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Label key={value} htmlFor={`rating-${value}`} className="flex-1 cursor-pointer">
                          <div className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                            rating === String(value) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}>
                            <input type="radio" name="rating" value={String(value)} id={`rating-${value}`} className="sr-only"
                              checked={rating === String(value)} onChange={() => setRating(String(value))} />
                            <Star className={`h-6 w-6 ${rating === String(value) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedback">Your Feedback</Label>
                    <Textarea id="feedback" placeholder="Share your experience..." rows={6} required
                      value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suggestions">Suggestions (optional)</Label>
                    <Textarea id="suggestions" placeholder="Any suggestions for improvement?" rows={4}
                      value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
                  </div>
                </div>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Feedback'}
              </Button>
            </form>
          ) : (
            <Card className="p-8 text-center border-border/60">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No batches to review</h3>
              <p className="text-sm text-muted-foreground">
                You've already reviewed all your completed batches, or you have no completed sessions yet.
              </p>
            </Card>
          )}

          {/* Google Review */}
          <Card className="p-6 border-border/60 mt-6 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Love learning with us?</h3>
                <p className="text-sm text-muted-foreground">Share your experience on Google!</p>
              </div>
              <Button variant="outline" asChild>
                <a href="https://www.google.com/search?q=knead+and+frost+reviews" target="_blank" rel="noopener noreferrer">
                  Write a Review
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
                      <span className="text-sm font-medium">Batch Feedback</span>
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
