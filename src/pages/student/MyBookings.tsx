import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const MyBookings = () => {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, courses(title)')
        .eq('student_id', user.id)
        .order('booking_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: "Your slot has been released and is now available for others.",
      });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.booking_date);
    return bookingDate >= today && b.status !== 'cancelled';
  }) || [];

  const pastBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.booking_date);
    return bookingDate < today || b.status === 'cancelled';
  }) || [];

  const canCancel = (bookingDate: string) => {
    const date = new Date(bookingDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date >= tomorrow;
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">Manage your upcoming and past class bookings</p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Upcoming Classes</h2>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="p-6 border-border/60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{booking.courses?.title}</h3>
                          <Badge>Confirmed</Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{booking.time_slot}</span>
                          </div>
                        </div>
                      </div>
                      {canCancel(booking.booking_date) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelMutation.mutate(booking.id)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4" />
                              Cancel
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {canCancel(booking.booking_date) && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-amber-600">
                          Cancellation allowed until 11:59 PM on {new Date(new Date(booking.booking_date).setDate(new Date(booking.booking_date).getDate() - 1)).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-border/60">
                <p className="text-muted-foreground">No upcoming bookings</p>
                <Button asChild className="mt-4">
                  <Link to="/student/book-slot">Book a Slot</Link>
                </Button>
              </Card>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Past Classes</h2>
            {pastBookings.length > 0 ? (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <Card key={booking.id} className="p-6 border-border/60 opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{booking.courses?.title}</h3>
                          <Badge variant={booking.status === 'cancelled' ? 'destructive' : 'secondary'}>
                            {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{booking.time_slot}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-border/60">
                <p className="text-muted-foreground">No past bookings</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;