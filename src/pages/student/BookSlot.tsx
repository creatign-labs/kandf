import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Users, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BookSlot = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch user's active enrollment to get course_id
  const { data: enrollment } = useQuery({
    queryKey: ['active-enrollment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch batches for the enrolled course
  const { data: batches, isLoading } = useQuery({
    queryKey: ['available-batches', enrollment?.course_id],
    queryFn: async () => {
      if (!enrollment?.course_id) return [];
      
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('course_id', enrollment.course_id)
        .gt('available_seats', 0);
      
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment?.course_id
  });

  // Fetch existing bookings for the selected date
  const { data: existingBookings } = useQuery({
    queryKey: ['existing-bookings', selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedDate) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('student_id', user.id)
        .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedDate || !selectedBatchId || !enrollment) {
        throw new Error('Missing required data');
      }

      const selectedBatch = batches?.find(b => b.id === selectedBatchId);
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          student_id: user.id,
          course_id: enrollment.course_id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          time_slot: selectedBatch?.time_slot || '',
          status: 'confirmed'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Slot booked successfully!",
        description: `Your class is confirmed for ${selectedDate?.toLocaleDateString()}`,
      });
      setSelectedBatchId(null);
      queryClient.invalidateQueries({ queryKey: ['existing-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleBooking = () => {
    if (!selectedDate || !selectedBatchId) return;
    bookingMutation.mutate();
  };

  const selectedBatch = batches?.find(b => b.id === selectedBatchId);
  const hasExistingBooking = existingBookings && existingBookings.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Book a Class Slot</h1>
            <p className="text-muted-foreground">Select a date and time for your next class</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 mb-1">Booking Rules</p>
              <ul className="text-amber-800 space-y-1">
                <li>• Slots must be booked at least one day in advance</li>
                <li>• Cancellations allowed before 11:59 PM the previous day</li>
                <li>• No-shows will result in the class being marked as consumed</li>
              </ul>
            </div>
          </div>

          {!enrollment ? (
            <Card className="p-8 text-center border-border/60">
              <p className="text-muted-foreground">You need an active course enrollment to book slots.</p>
              <Button asChild className="mt-4">
                <a href="/courses">Browse Courses</a>
              </Button>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 border-border/60">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Select Date
                </h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < tomorrow}
                  className="rounded-md border"
                />
              </Card>

              <Card className="p-6 border-border/60">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Available Slots
                </h2>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : hasExistingBooking ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">You already have a booking for this date.</p>
                  </div>
                ) : selectedDate ? (
                  <div className="space-y-3">
                    {batches?.map((batch) => {
                      const isFull = batch.available_seats === 0;
                      const isSelected = selectedBatchId === batch.id;

                      return (
                        <button
                          key={batch.id}
                          onClick={() => !isFull && setSelectedBatchId(batch.id)}
                          disabled={isFull}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : isFull
                              ? "border-border bg-muted/50 cursor-not-allowed opacity-60"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{batch.time_slot}</span>
                            <Badge variant={isFull ? "secondary" : "default"}>
                              {isFull ? "Full" : `${batch.available_seats} seats left`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{batch.total_seats - batch.available_seats} / {batch.total_seats} students booked</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {batch.days}
                          </div>
                        </button>
                      );
                    })}
                    {(!batches || batches.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No available slots for this course
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Please select a date first
                  </p>
                )}
              </Card>
            </div>
          )}

          {selectedDate && selectedBatchId && !hasExistingBooking && (
            <Card className="p-6 border-border/60 mt-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedBatch?.time_slot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{enrollment?.courses?.title}</span>
                </div>
              </div>
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handleBooking}
                disabled={bookingMutation.isPending}
              >
                {bookingMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookSlot;