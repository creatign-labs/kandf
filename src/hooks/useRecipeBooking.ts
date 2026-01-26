import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
      if (!courseId || !recipeId) return [];

      const { data, error } = await supabase
        .rpc('get_available_recipe_slots', {
          p_course_id: courseId,
          p_recipe_id: recipeId
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId && !!recipeId
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
      recipeId: string;
      batchDate: string;
      timeSlot: string;
    }): Promise<BookingResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('book_recipe_slot', {
          p_student_id: user.id,
          p_course_id: courseId,
          p_recipe_id: recipeId,
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
    onSuccess: () => {
      toast({
        title: "Slot booked successfully!",
        description: "You have been added to the recipe batch.",
      });
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
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: "Your slot has been released.",
      });
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

      const { data, error } = await supabase
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

      if (error) throw error;
      return data || [];
    }
  });
}
