import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Users, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const slots = [
  { id: 1, time: "9:00 AM - 12:00 PM", capacity: 15, booked: 12, available: 3 },
  { id: 2, time: "2:00 PM - 5:00 PM", capacity: 15, booked: 15, available: 0 },
  { id: 3, time: "6:00 PM - 9:00 PM", capacity: 15, booked: 8, available: 7 },
];

const BookSlot = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const handleBooking = () => {
    if (!selectedDate || !selectedSlot) return;

    toast({
      title: "Slot booked successfully!",
      description: `Your class is confirmed for ${selectedDate.toLocaleDateString()} at ${slots.find(s => s.id === selectedSlot)?.time}`,
    });

    setTimeout(() => {
      setSelectedSlot(null);
    }, 1500);
  };

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
              
              {selectedDate ? (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const isFull = slot.available === 0;
                    const isSelected = selectedSlot === slot.id;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => !isFull && setSelectedSlot(slot.id)}
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
                          <span className="font-semibold">{slot.time}</span>
                          <Badge variant={isFull ? "secondary" : "default"}>
                            {isFull ? "Full" : `${slot.available} seats left`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{slot.booked} / {slot.capacity} students booked</span>
                        </div>
                        {isFull && slot.id === 2 && (
                          <p className="mt-2 text-sm text-primary">
                            Next available: 6:00 PM - 9:00 PM
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Please select a date first
                </p>
              )}
            </Card>
          </div>

          {selectedDate && selectedSlot && (
            <Card className="p-6 border-border/60 mt-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {slots.find(s => s.id === selectedSlot)?.time}
                  </span>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={handleBooking}>
                Confirm Booking
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookSlot;
