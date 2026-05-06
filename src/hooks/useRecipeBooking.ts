import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Determine if a given weekday name (e.g. "Monday") falls within a batch's
// days-of-week string. Supports comma lists ("Monday, Wednesday, Friday"),
// arrays ({Monday,Wednesday}), short forms ("Mon, Wed"), and ranges
// ("Monday to Friday", "Monday-Saturday").
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function isDayInBatchDays(dayName: string, daysStr: string | null | undefined): boolean {
  if (!daysStr) return true;
  const cleaned = daysStr.replace(/[{}]/g, '').trim();
  const lower = cleaned.toLowerCase();
  const day = dayName.toLowerCase();
  const dayShort = day.slice(0, 3);

  // Range syntax: "Monday to Friday" or "Monday-Friday"
  const rangeMatch = lower.match(/^([a-z]+)\s*(?:to|-|–|—)\s*([a-z]+)$/);
  if (rangeMatch) {
    const startIdx = WEEKDAYS.findIndex(w => w.toLowerCase().startsWith(rangeMatch[1].slice(0, 3)));
    const endIdx = WEEKDAYS.findIndex(w => w.toLowerCase().startsWith(rangeMatch[2].slice(0, 3)));
    const dayIdx = WEEKDAYS.findIndex(w => w.toLowerCase() === day);
    if (startIdx === -1 || endIdx === -1 || dayIdx === -1) return false;
    if (startIdx <= endIdx) return dayIdx >= startIdx && dayIdx <= endIdx;
    return dayIdx >= startIdx || dayIdx <= endIdx;
  }

  // List syntax
  const parts = lower.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
  return parts.some(p => p === day || p.startsWith(dayShort) || day.startsWith(p));
}

interface BookingEligibility {
  is_eligible: boolean;
  reason: string;
  next_recipe_id: string | null;
  next_recipe_title: string | null;
  course_id: string | null;
}

interface AvailableSlot {
  batch_date: string;
  time_slot: string;
  recipe_batch_id: string | null;
  capacity: number;
  current_count: number;
  available_spots: number;
}

interface BookingResult {
  success: boolean;
  message: string;
  recipe_batch_id: string | null;
  booking_id: string | null;
}

export function useBookingEligibility() {
  return useQuery({
    queryKey: ['booking-eligibility'],
    queryFn: async (): Promise<BookingEligibility | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('check_student_booking_eligibility', { p_student_id: user.id });

      if (error) throw error;
      return data?.[0] || null;
    }
  });
}

export function useAvailableRecipeSlots(courseId: string | null, recipeId: string | null) {
  return useQuery({
    queryKey: ['available-recipe-slots', courseId, recipeId],
    queryFn: async (): Promise<AvailableSlot[]> => {
      if (!courseId) return [];

      // If recipeId is null, fetch generic slots (all batches for the course)
      if (!recipeId) {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .eq('course_id', courseId)
          .eq('booking_enabled', true);

        if (error) throw error;

        // Transform batch data into AvailableSlot format
        // Generate slots for the next 30 days, respecting start_date and days-of-week
        const slots: AvailableSlot[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 1; i <= 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          
          for (const batch of (data || [])) {
            // Enforce batch start_date
            if (batch.start_date && dateStr < batch.start_date) continue;
            // Enforce batch days-of-week
            if (!isDayInBatchDays(dayName, batch.days)) continue;

            slots.push({
              batch_date: dateStr,
              time_slot: batch.time_slot,
              recipe_batch_id: null,
              capacity: batch.total_seats,
              current_count: 0,
              available_spots: batch.available_seats,
            });
          }
        }
        return slots;
      }

      const { data, error } = await supabase
        .rpc('get_available_recipe_slots', {
          p_course_id: courseId,
          p_recipe_id: recipeId
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId
  });
}

export function useBookRecipeSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      recipeId,
      batchDate,
      timeSlot
    }: {
      courseId: string;
      recipeId: string | null;
      batchDate: string;
      timeSlot: string;
    }): Promise<BookingResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('book_recipe_slot', {
          p_student_id: user.id,
          p_course_id: courseId,
          p_recipe_id: recipeId || null,
          p_batch_date: batchDate,
          p_time_slot: timeSlot
        });

      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Booking failed');
      }
      
      return result;
    },
    onSuccess: async (result, variables) => {
      toast({
        title: "Slot booked successfully!",
        description: "You have been added to the recipe batch. A confirmation email is on its way.",
      });

      // Send branded confirmation email (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
          const [{ data: course }, { data: recipe }] = await Promise.all([
            supabase.from('courses').select('title').eq('id', variables.courseId).single(),
            variables.recipeId
              ? supabase.from('recipes').select('title').eq('id', variables.recipeId).single()
              : Promise.resolve({ data: null } as any),
          ]);
          await supabase.functions.invoke('send-branded-email', {
            body: {
              template: 'slot_booking_confirmation',
              to: user.email,
              data: {
                name: profile?.first_name || 'there',
                booking_date: variables.batchDate,
                time_slot: variables.timeSlot,
                course_title: course?.title || null,
                recipe_title: recipe?.title || null,
              },
            },
          });
        }
      } catch (e) {
        console.error('Failed to send booking confirmation email:', e);
      }

      queryClient.invalidateQueries({ queryKey: ['booking-eligibility'] });
      queryClient.invalidateQueries({ queryKey: ['available-recipe-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipe-bookings'] });
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
}

export function useCancelRecipeBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<{ success: boolean; message: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('cancel_recipe_booking', {
          p_student_id: user.id,
          p_booking_id: bookingId
        });

      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Cancellation failed');
      }
      
      return result;
    },
    onSuccess: async (_, bookingId) => {
      toast({
        title: "Booking cancelled",
        description: "Your slot has been released.",
      });

      // Notify admins and super admins about the cancellation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user?.id || '').single();
        const studentName = profile ? `${profile.first_name} ${profile.last_name}` : 'A student';
        
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (adminRoles && adminRoles.length > 0) {
          const notifications = adminRoles.map(r => ({
            user_id: r.user_id,
            title: 'Booking Cancelled by Student',
            message: `${studentName} has cancelled their booking.`,
            type: 'alert',
            read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (e) {
        // Non-critical: don't block on notification failure
        console.error('Failed to notify admins about cancellation:', e);
      }

      queryClient.invalidateQueries({ queryKey: ['booking-eligibility'] });
      queryClient.invalidateQueries({ queryKey: ['available-recipe-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipe-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useMyRecipeBookings() {
  return useQuery({
    queryKey: ['my-recipe-bookings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch from recipe_batch_memberships (slot-booked entries)
      const { data: membershipData, error: membershipError } = await supabase
        .from('recipe_batch_memberships')
        .select(`
          *,
          recipe_batches (
            id,
            batch_date,
            time_slot,
            capacity,
            is_manually_adjusted,
            recipes (id, title),
            courses (id, title)
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (membershipError) throw membershipError;

      // Fetch from bookings table (admin-assigned recipes)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          course_id,
          booking_date,
          time_slot,
          status,
          recipe_id,
          assigned_chef_id,
          table_number,
          created_at,
          recipes (id, title),
          courses (id, title)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Collect booking_ids already represented in memberships
      const membershipBookingIds = new Set(
        (membershipData || []).map(m => m.booking_id).filter(Boolean)
      );

      // Convert bookings not already in memberships into a compatible shape
      const bookingsOnly = (bookingsData || [])
        .filter(b => !membershipBookingIds.has(b.id))
        .map(b => ({
          id: `booking-${b.id}`,
          student_id: b.student_id,
          recipe_batch_id: null,
          booking_id: b.id,
          is_manual_assignment: false,
          assigned_by: null,
          assigned_at: b.created_at,
          created_at: b.created_at,
          recipe_batches: {
            id: null,
            batch_date: b.booking_date,
            time_slot: b.time_slot,
            capacity: 0,
            is_manually_adjusted: false,
            recipes: b.recipes,
            courses: b.courses,
          },
          _source: 'booking' as const,
          _assigned_chef_id: b.assigned_chef_id,
          _table_number: b.table_number,
          _recipe: b.recipes,
        }));

      // Also enrich membership data with booking-level info
      const enrichedMemberships = (membershipData || []).map(m => {
        const matchingBooking = (bookingsData || []).find(b => b.id === m.booking_id);
        return {
          ...m,
          _assigned_chef_id: matchingBooking?.assigned_chef_id || null,
          _table_number: matchingBooking?.table_number || null,
          _recipe: matchingBooking?.recipes || m.recipe_batches?.recipes || null,
        };
      });

      // Merge: memberships first, then bookings-only entries
      return [...enrichedMemberships, ...bookingsOnly];
    }
  });
}
