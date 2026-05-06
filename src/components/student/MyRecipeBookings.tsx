import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Loader2,
  ChefHat,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UtensilsCrossed,
  Hash
} from "lucide-react";
import { format, parseISO, isAfter, startOfDay, addDays } from "date-fns";
import { useMyRecipeBookings, useCancelRecipeBooking } from "@/hooks/useRecipeBooking";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MyRecipeBookings() {
  const { data: bookings, isLoading } = useMyRecipeBookings();
  const cancelMutation = useCancelRecipeBooking();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch booking statuses from bookings table for accurate status display
  const { data: bookingStatuses } = useQuery({
    queryKey: ['my-booking-statuses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('student_id', user.id);
      const map: Record<string, string> = {};
      data?.forEach(b => { map[b.id] = b.status; });
      return map;
    }
  });

  // Fetch attendance records for status mapping
  const { data: attendanceRecords } = useQuery({
    queryKey: ['my-attendance-records'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase
        .from('attendance')
        .select('student_id, class_date, status')
        .eq('student_id', user.id);
      const map: Record<string, string> = {};
      data?.forEach(a => { map[a.class_date] = a.status; });
      return map;
    }
  });

  // Fetch no-show count for warnings
  const { data: noShowCount } = useQuery({
    queryKey: ['my-no-show-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'no_show');
      return count || 0;
    }
  });

  // Collect unique chef IDs and fetch their names
  const chefIds = [...new Set(
    (bookings || []).map((b: any) => b._assigned_chef_id).filter(Boolean)
  )];
  
  const { data: chefProfiles } = useQuery({
    queryKey: ['chef-profiles', chefIds],
    queryFn: async () => {
      if (chefIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', chefIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = `${p.first_name} ${p.last_name}`.trim(); });
      return map;
    },
    enabled: chefIds.length > 0,
  });

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const getBookingStatus = (booking: any): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode } => {
    const batch = booking.recipe_batches;
    if (!batch) return { label: "Unknown", variant: "outline", icon: null };
    
    const bookingId = booking.booking_id;
    const bookingStatus = bookingId && bookingStatuses ? bookingStatuses[bookingId] : null;
    const batchDate = batch.batch_date;
    const attendanceStatus = attendanceRecords?.[batchDate];

    // If cancelled
    if (bookingStatus === 'cancelled') {
      return { label: "Cancelled", variant: "outline", icon: <XCircle className="h-3 w-3" /> };
    }

    // If attendance recorded
    if (attendanceStatus === 'present') {
      return { label: "Attended", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> };
    }
    if (attendanceStatus === 'no_show') {
      return { label: "No Show", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> };
    }

    // Future booking
    const batchDateParsed = parseISO(batchDate);
    if (isAfter(batchDateParsed, today) || format(batchDateParsed, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return { label: "Booked", variant: "secondary", icon: <CalendarIcon className="h-3 w-3" /> };
    }

    // Past with no attendance record — likely completed
    return { label: "Completed", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> };
  };

  // Split into upcoming and past
  const upcomingBookings = bookings?.filter(b => {
    const batchDate = parseISO(b.recipe_batches?.batch_date || '');
    const bookingStatus = b.booking_id && bookingStatuses ? bookingStatuses[b.booking_id] : null;
    if (bookingStatus === 'cancelled') return false;
    return isAfter(batchDate, today) || format(batchDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  }) || [];

  const pastBookings = bookings?.filter(b => {
    const batchDate = parseISO(b.recipe_batches?.batch_date || '');
    const bookingStatus = b.booking_id && bookingStatuses ? bookingStatuses[b.booking_id] : null;
    if (bookingStatus === 'cancelled') return true; // show cancelled in past
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
      {/* No-show warning */}
      {(noShowCount || 0) >= 2 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive mb-1">No-Show Warning</p>
            <p className="text-destructive/80">
              You have {noShowCount} no-show(s). {(noShowCount || 0) >= 3 
                ? "Your booking access has been locked. Contact admin."
                : "One more no-show will lock your booking access."}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((booking: any) => {
              const batch = booking.recipe_batches;
              if (!batch) return null;
              const status = getBookingStatus(booking);
              const recipeName = booking._recipe?.title || batch.recipes?.title;
              const chefName = booking._assigned_chef_id && chefProfiles?.[booking._assigned_chef_id];
              const tableNumber = booking._table_number;

              return (
                <Card key={booking.id} className="p-4 md:p-6 border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-primary" />
                          {format(parseISO(batch.batch_date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <Badge variant={status.variant} className="gap-1">
                          {status.icon}
                          {status.label}
                        </Badge>
                        {booking.is_manual_assignment && (
                          <Badge variant="outline">Manually Assigned</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{batch.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{batch.courses?.title}</span>
                        </div>
                        {recipeName && (
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4" />
                            <span>Recipe: <span className="text-foreground font-medium">{recipeName}</span></span>
                          </div>
                        )}
                        {chefName && (
                          <div className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4" />
                            <span>Chef: <span className="text-foreground font-medium">{chefName}</span></span>
                          </div>
                        )}
                        {tableNumber && (
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            <span>Table: <span className="text-foreground font-medium">{tableNumber}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                    {booking.booking_id && canCancel(batch.batch_date) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setCancellingId(booking.booking_id!);
                          cancelMutation.mutate(booking.booking_id!, {
                            onSettled: () => setCancellingId(null),
                          });
                        }}
                        disabled={cancellingId === booking.booking_id}
                      >
                        {cancellingId === booking.booking_id ? (
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
            {pastBookings.map((booking: any) => {
              const batch = booking.recipe_batches;
              if (!batch) return null;
              const status = getBookingStatus(booking);
              const recipeName = booking._recipe?.title || batch.recipes?.title;
              const chefName = booking._assigned_chef_id && chefProfiles?.[booking._assigned_chef_id];
              const tableNumber = booking._table_number;

              return (
                <Card key={booking.id} className="p-4 md:p-6 border-border/60 opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(parseISO(batch.batch_date), 'MMMM d, yyyy')}
                        </h3>
                        <Badge variant={status.variant} className="gap-1">
                          {status.icon}
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <span>{batch.time_slot}</span>
                        <span className="mx-2">•</span>
                        <span>{batch.courses?.title}</span>
                        {recipeName && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Recipe: {recipeName}</span>
                          </>
                        )}
                        {chefName && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Chef: {chefName}</span>
                          </>
                        )}
                        {tableNumber && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Table: {tableNumber}</span>
                          </>
                        )}
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
