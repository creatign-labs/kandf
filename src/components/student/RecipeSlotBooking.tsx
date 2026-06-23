import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  Lock,
  ChefHat
} from "lucide-react";
import { format, addDays } from "date-fns";
import { 
  useBookingEligibility, 
  useAvailableRecipeSlots, 
  useBookRecipeSlot
} from "@/hooks/useRecipeBooking";

interface RecipeSlotBookingProps {
  courseId?: string;
  onBooked?: () => void;
}

export function RecipeSlotBooking({ courseId, onBooked }: RecipeSlotBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<{ timeSlot: string; batchId: string | null } | null>(null);

  // Use provided props or fall back to eligibility check
  const { data: eligibility, isLoading: eligibilityLoading } = useBookingEligibility();
  
  // Determine which course to use — recipe is no longer specified.
  // Course is locked to the student's active enrollment; we ignore any passed-in
  // courseId that doesn't match to keep booking strictly course-scoped.
  const effectiveCourseId = eligibility?.course_id || courseId || null;

  const { data: availableSlots, isLoading: slotsLoading } = useAvailableRecipeSlots(
    effectiveCourseId,
    null
  );
  const bookMutation = useBookRecipeSlot();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);

  // Set of date strings (yyyy-MM-dd) the batch actually runs on
  const allowedDateSet = new Set((availableSlots || []).map(s => s.batch_date));



  // Filter slots for selected date
  const slotsForDate = selectedDate
    ? availableSlots?.filter(slot => slot.batch_date === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const handleBooking = () => {
    if (!selectedDate || !selectedSlot || !effectiveCourseId) return;

    bookMutation.mutate({
      courseId: effectiveCourseId,
      recipeId: null,
      batchDate: format(selectedDate, 'yyyy-MM-dd'),
      timeSlot: selectedSlot.timeSlot,
      batchId: selectedSlot.batchId,
    }, {
      onSuccess: () => {
        onBooked?.();
      }
    });
  };

  // If no props provided and using eligibility, show loading
  if (!courseId && eligibilityLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  // If no props and not eligible
  if (!courseId && !eligibility?.is_eligible) {
    return (
      <Card className="p-6 border-border/60">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Booking Not Available</h3>
            <p className="text-muted-foreground">{eligibility?.reason || 'Unable to book at this time.'}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Booking Rules */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Booking Rules</p>
          <ul className="text-amber-800 dark:text-amber-200 space-y-1">
            <li>• Slots must be booked at least one day in advance</li>
            <li>• Cancellations allowed before 11:59 PM the previous day</li>
          </ul>
        </div>
      </div>

      {/* Date & Slot Selection */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 md:p-6 border-border/60">
          <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Select Date
          </h2>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              disabled={(date) => {
                if (date < tomorrow) return true;
                // Only allow dates within the course's running schedule
                if (allowedDateSet.size === 0) return false;
                const ds = format(date, 'yyyy-MM-dd');
                return !allowedDateSet.has(ds);
              }}

              className="rounded-md border"
            />
          </div>
        </Card>

        <Card className="p-4 md:p-6 border-border/60">
          <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Available Slots
          </h2>

          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedDate ? (
            <div className="space-y-3">
              {slotsForDate && slotsForDate.length > 0 ? (
                slotsForDate.map((slot, index) => {
                  const isSelected =
                    selectedSlot?.timeSlot === slot.time_slot &&
                    (selectedSlot as any)?.batchId === ((slot as any).batch_id || null);
                  const isFull = slot.available_spots <= 0;

                  return (
                    <button
                      key={`${(slot as any).batch_id || 'b'}-${slot.time_slot}-${index}`}
                      onClick={() => setSelectedSlot({
                        timeSlot: slot.time_slot,
                        batchId: (slot as any).batch_id || null,
                      })}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{slot.time_slot}</span>
                        <Badge variant={isFull ? "secondary" : "default"}>
                          {isFull ? "Slots Full — Try different slot" : `${slot.available_spots} spots`}
                        </Badge>
                      </div>
                      {(slot as any).batch_name && (
                        <div className="text-xs text-muted-foreground">
                          Batch: {(slot as any).batch_name}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No available slots for this date
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

      {/* Booking Summary */}
      {selectedDate && selectedSlot && (
        <Card className="p-4 md:p-6 border-border/60">
          <h3 className="font-semibold mb-4">Booking Summary</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{selectedSlot.timeSlot}</span>
            </div>
          </div>
          {bookMutation.isSuccess ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-semibold">
              <CheckCircle className="h-5 w-5" />
              Booking Confirmed!
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleBooking}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
