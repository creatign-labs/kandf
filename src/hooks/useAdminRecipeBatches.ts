import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RecipeBatch {
  id: string;
  course_id: string;
  recipe_id: string;
  time_slot: string;
  batch_date: string;
  capacity: number;
  is_manually_adjusted: boolean;
  created_at: string;
  updated_at: string;
  recipes?: {
    id: string;
    title: string;
  };
  courses?: {
    id: string;
    title: string;
  };
  members?: BatchMember[];
  member_count?: number;
}

interface BatchMember {
  id: string;
  student_id: string;
  booking_id: string | null;
  is_manual_assignment: boolean;
  assigned_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  student_id: string;
  course_id: string;
  recipe_id: string;
  previous_batch_id: string | null;
  new_batch_id: string | null;
  reason: string | null;
  created_at: string;
  actor_profile?: {
    first_name: string;
    last_name: string;
  };
  student_profile?: {
    first_name: string;
    last_name: string;
  };
  recipe?: {
    title: string;
  };
}

export function useRecipeBatches(selectedDate?: Date, courseFilter?: string) {
  return useQuery({
    queryKey: ['recipe-batches', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null, courseFilter],
    queryFn: async (): Promise<RecipeBatch[]> => {
      let query = supabase
        .from('recipe_batches')
        .select(`
          *,
          recipes (id, title),
          courses (id, title)
        `)
        .order('batch_date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (selectedDate) {
        query = query.eq('batch_date', format(selectedDate, 'yyyy-MM-dd'));
      }

      if (courseFilter && courseFilter !== 'all') {
        query = query.eq('course_id', courseFilter);
      }

      const { data: batches, error } = await query;
      if (error) throw error;

      // Fetch member counts for each batch
      const batchesWithCounts = await Promise.all(
        (batches || []).map(async (batch) => {
          const { count } = await supabase
            .from('recipe_batch_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('recipe_batch_id', batch.id);

          return {
            ...batch,
            member_count: count || 0
          };
        })
      );

      return batchesWithCounts;
    }
  });
}

export function useRecipeBatchMembers(batchId: string | null) {
  return useQuery({
    queryKey: ['recipe-batch-members', batchId],
    queryFn: async (): Promise<BatchMember[]> => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from('recipe_batch_memberships')
        .select('*')
        .eq('recipe_batch_id', batchId);

      if (error) throw error;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', member.student_id)
            .single();

          return {
            ...member,
            profile
          };
        })
      );

      return membersWithProfiles;
    },
    enabled: !!batchId
  });
}

export function useMoveStudentBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      fromBatchId,
      toBatchId,
      reason
    }: {
      studentId: string;
      fromBatchId: string;
      toBatchId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('admin_move_student_batch', {
          p_student_id: studentId,
          p_from_batch_id: fromBatchId,
          p_to_batch_id: toBatchId,
          p_reason: reason || null
        });

      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Move failed');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Student moved successfully",
        description: "The batch assignment has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['recipe-batches'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-batch-members'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-batch-audit-log'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to move student",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useRemoveStudentFromBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      batchId,
      reason
    }: {
      studentId: string;
      batchId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('admin_remove_student_from_batch', {
          p_student_id: studentId,
          p_batch_id: batchId,
          p_reason: reason || null
        });

      if (error) throw error;
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Removal failed');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Student removed",
        description: "Student has been removed from the batch.",
      });
      queryClient.invalidateQueries({ queryKey: ['recipe-batches'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-batch-members'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-batch-audit-log'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove student",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useRecipeBatchAuditLog(filters?: { studentId?: string; recipeId?: string }) {
  return useQuery({
    queryKey: ['recipe-batch-audit-log', filters],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      let query = supabase
        .from('recipe_batch_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.recipeId) {
        query = query.eq('recipe_id', filters.recipeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch related data
      const logsWithDetails = await Promise.all(
        (data || []).map(async (log) => {
          const [actorProfile, studentProfile, recipe] = await Promise.all([
            supabase.from('profiles').select('first_name, last_name').eq('id', log.actor_id).single(),
            supabase.from('profiles').select('first_name, last_name').eq('id', log.student_id).single(),
            supabase.from('recipes').select('title').eq('id', log.recipe_id).single()
          ]);

          return {
            ...log,
            actor_profile: actorProfile.data,
            student_profile: studentProfile.data,
            recipe: recipe.data
          };
        })
      );

      return logsWithDetails;
    }
  });
}

export function useSameDateRecipeBatches(recipeId: string | null, batchDate: string | null, excludeBatchId?: string) {
  return useQuery({
    queryKey: ['same-date-recipe-batches', recipeId, batchDate, excludeBatchId],
    queryFn: async (): Promise<RecipeBatch[]> => {
      if (!recipeId || !batchDate) return [];

      let query = supabase
        .from('recipe_batches')
        .select(`
          *,
          recipes (id, title),
          courses (id, title)
        `)
        .eq('recipe_id', recipeId)
        .eq('batch_date', batchDate);

      if (excludeBatchId) {
        query = query.neq('id', excludeBatchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch member counts
      const batchesWithCounts = await Promise.all(
        (data || []).map(async (batch) => {
          const { count } = await supabase
            .from('recipe_batch_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('recipe_batch_id', batch.id);

          return {
            ...batch,
            member_count: count || 0
          };
        })
      );

      return batchesWithCounts;
    },
    enabled: !!recipeId && !!batchDate
  });
}
