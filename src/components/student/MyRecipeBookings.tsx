import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Loader2,
  ChefHat,
  Users
} from "lucide-react";
import { format, parseISO, isAfter, startOfDay, addDays } from "date-fns";
import { useMyRecipeBookings, useCancelRecipeBooking } from "@/hooks/useRecipeBooking";

export function MyRecipeBookings() {
  const { data: bookings, isLoading } = useMyRecipeBookings();
  const cancelMutation = useCancelRecipeBooking();

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // Split into upcoming and past
  const upcomingBookings = bookings?.filter(b => {
    const batchDate = parseISO(b.recipe_batches?.batch_date || '');
    return isAfter(batchDate, today) || format(batchDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  }) || [];

  const pastBookings = bookings?.filter(b => {
    const batchDate = parseISO(b.recipe_batches?.batch_date || '');
    return !isAfter(batchDate, today) && format(batchDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd');
  }) || [];

  const canCancel = (batchDate: string) => {
    const date = parseISO(batchDate);
    return isAfter(date, tomorrow);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const batch = booking.recipe_batches;
              if (!batch) return null;

              return (
                <Card key={booking.id} className="p-4 md:p-6 border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <ChefHat className="h-5 w-5 text-primary" />
                          {batch.recipes?.title}
                        </h3>
                        <Badge>Confirmed</Badge>
                        {booking.is_manual_assignment && (
                          <Badge variant="outline">Manually Assigned</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {format(parseISO(batch.batch_date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{batch.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{batch.courses?.title}</span>
                        </div>
                      </div>
                    </div>
                    {booking.booking_id && canCancel(batch.batch_date) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelMutation.mutate(booking.booking_id!)}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {booking.booking_id && canCancel(batch.batch_date) && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Cancellation allowed until 11:59 PM on{' '}
                        {format(addDays(parseISO(batch.batch_date), -1), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center border-border/60">
            <p className="text-muted-foreground">No upcoming sessions</p>
          </Card>
        )}
      </div>

      {/* Past */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
          <div className="space-y-4">
            {pastBookings.map((booking) => {
              const batch = booking.recipe_batches;
              if (!batch) return null;

              return (
                <Card key={booking.id} className="p-4 md:p-6 border-border/60 opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-muted-foreground" />
                          {batch.recipes?.title}
                        </h3>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>{format(parseISO(batch.batch_date), 'MMMM d, yyyy')}</span>
                        <span className="mx-2">•</span>
                        <span>{batch.time_slot}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
