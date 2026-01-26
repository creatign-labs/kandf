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
import { format, addDays, parseISO } from "date-fns";
import { 
  useBookingEligibility, 
  useAvailableRecipeSlots, 
  useBookRecipeSlot 
} from "@/hooks/useRecipeBooking";

export function RecipeSlotBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<{ timeSlot: string; batchId: string | null } | null>(null);

  const { data: eligibility, isLoading: eligibilityLoading } = useBookingEligibility();
  const { data: availableSlots, isLoading: slotsLoading } = useAvailableRecipeSlots(
    eligibility?.course_id || null,
    eligibility?.next_recipe_id || null
  );
  const bookMutation = useBookRecipeSlot();

  const tomorrow = addDays(new Date(), 1);

  // Filter slots for selected date
  const slotsForDate = selectedDate
    ? availableSlots?.filter(slot => slot.batch_date === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const handleBooking = () => {
    if (!selectedDate || !selectedSlot || !eligibility?.course_id || !eligibility?.next_recipe_id) return;

    bookMutation.mutate({
      courseId: eligibility.course_id,
      recipeId: eligibility.next_recipe_id,
      batchDate: format(selectedDate, 'yyyy-MM-dd'),
      timeSlot: selectedSlot.timeSlot
    });
  };

  if (eligibilityLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!eligibility?.is_eligible) {
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
    <div className="space-y-6">
      {/* Current Recipe Info */}
      <Card className="p-6 border-border/60 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your Next Recipe</p>
            <h3 className="font-semibold text-xl">{eligibility.next_recipe_title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Book a slot below to attend this recipe session
            </p>
          </div>
        </div>
      </Card>

      {/* Booking Rules */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Booking Rules</p>
          <ul className="text-amber-800 dark:text-amber-200 space-y-1">
            <li>• Slots must be booked at least one day in advance</li>
            <li>• Cancellations allowed before 11:59 PM the previous day</li>
            <li>• You will be grouped with other students learning the same recipe</li>
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
              disabled={(date) => date < tomorrow}
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
                  const isFull = slot.available_spots <= 0;
                  const isSelected = selectedSlot?.timeSlot === slot.time_slot;

                  return (
                    <button
                      key={`${slot.time_slot}-${index}`}
                      onClick={() => !isFull && setSelectedSlot({ 
                        timeSlot: slot.time_slot, 
                        batchId: slot.recipe_batch_id 
                      })}
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
                        <span className="font-semibold">{slot.time_slot}</span>
                        <Badge variant={isFull ? "secondary" : "default"}>
                          {isFull ? "Full" : `${slot.available_spots} spots`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {slot.current_count} / {slot.capacity} students
                          {slot.recipe_batch_id && " (batch exists)"}
                        </span>
                      </div>
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
              <span className="text-muted-foreground">Recipe</span>
              <span className="font-medium">{eligibility.next_recipe_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{selectedSlot.timeSlot}</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
              You will be auto-grouped with other students learning this recipe
            </p>
          </div>
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
        </Card>
      )}
    </div>
  );
}
