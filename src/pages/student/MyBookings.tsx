import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const MyBookings = () => {
  const [bookings, setBookings] = useState([
    {
      id: 1,
      date: "2025-01-22",
      time: "9:00 AM - 12:00 PM",
      recipe: "Danish Pastries",
      status: "upcoming",
      canCancel: true,
    },
    {
      id: 2,
      date: "2025-01-25",
      time: "2:00 PM - 5:00 PM",
      recipe: "Croissants",
      status: "upcoming",
      canCancel: true,
    },
    {
      id: 3,
      date: "2025-01-18",
      time: "9:00 AM - 12:00 PM",
      recipe: "Basic White Bread",
      status: "completed",
      canCancel: false,
    },
  ]);

  const handleCancel = (id: number) => {
    setBookings(bookings.filter(b => b.id !== id));
    toast({
      title: "Booking cancelled",
      description: "Your slot has been released and is now available for others.",
    });
  };

  const upcomingBookings = bookings.filter(b => b.status === "upcoming");
  const pastBookings = bookings.filter(b => b.status === "completed");

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
                          <h3 className="text-lg font-semibold">{booking.recipe}</h3>
                          <Badge>Confirmed</Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{booking.time}</span>
                          </div>
                        </div>
                      </div>
                      {booking.canCancel && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(booking.id)}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-amber-600">
                        Cancellation allowed until 11:59 PM on {new Date(new Date(booking.date).setDate(new Date(booking.date).getDate() - 1)).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-border/60">
                <p className="text-muted-foreground">No upcoming bookings</p>
                <Button asChild className="mt-4">
                  <a href="/student/book-slot">Book a Slot</a>
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
                          <h3 className="text-lg font-semibold">{booking.recipe}</h3>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{booking.time}</span>
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
