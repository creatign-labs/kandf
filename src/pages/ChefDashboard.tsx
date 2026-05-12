import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, CheckCircle2, Clock, Loader2, ChefHat, XCircle, AlertTriangle, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays, parseISO } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ChefDashboard = () => {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [attendanceState, setAttendanceState] = useState<Record<string, Record<string, 'present' | 'absent'>>>({});
  const [confirmBatchId, setConfirmBatchId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});

  // Fetch chef profile
  const { data: profile } = useQuery({
    queryKey: ['chef-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch today's recipe batches assigned to this chef (via bookings with assigned_chef_id)
  const { data: todaysBatches, isLoading } = useQuery({
    queryKey: ['chef-todays-batches', today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get bookings for today across all assigned chefs (singular + array)
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id, student_id, course_id, recipe_id, recipe_ids, assigned_chef_id, assigned_chef_ids, time_slot, status, booking_date,
          courses(title)
        `)
        .eq('booking_date', today)
        .in('status', ['confirmed', 'attended', 'no_show']);

      if (error) throw error;

      const allBookings = (bookings || []).filter((b: any) => {
        const chefs = [b.assigned_chef_id, ...((b.assigned_chef_ids as string[]) || [])].filter(Boolean);
        return chefs.includes(user.id);
      });

      // Resolve all recipe IDs referenced by these bookings, then fetch titles
      const recipeIdSet = new Set<string>();
      allBookings.forEach((b: any) => {
        const rids = [b.recipe_id, ...((b.recipe_ids as string[]) || [])].filter(Boolean);
        rids.forEach((r: string) => recipeIdSet.add(r));
      });
      const recipeIdList = Array.from(recipeIdSet);
      const { data: recipeRows } = recipeIdList.length > 0
        ? await supabase.from('recipes').select('id, title').in('id', recipeIdList)
        : { data: [] as { id: string; title: string }[] };
      const recipeTitleMap = new Map((recipeRows || []).map((r: any) => [r.id, r.title]));

      // Get student profiles
      const studentIds = [...new Set(allBookings.map(b => b.student_id))];
      const { data: profiles } = studentIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', studentIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Group by time_slot + recipe (one row per recipe per booking)
      const grouped: Record<string, {
        timeSlot: string;
        recipeId: string | null;
        recipeTitle: string;
        courseName: string;
        students: { id: string; name: string; bookingId: string; bookingStatus: string }[];
      }> = {};

      allBookings.forEach((b: any) => {
        const resolvedRecipes = Array.from(new Set(
          [b.recipe_id, ...((b.recipe_ids as string[]) || [])].filter(Boolean)
        ));
        const recipeKeys: (string | null)[] = resolvedRecipes.length > 0 ? resolvedRecipes : [null];

        recipeKeys.forEach((rid) => {
          const key = `${b.time_slot}__${rid || 'none'}`;
          if (!grouped[key]) {
            grouped[key] = {
              timeSlot: b.time_slot,
              recipeId: rid,
              recipeTitle: rid ? (recipeTitleMap.get(rid) || 'Recipe') : 'No Recipe',
              courseName: b.courses?.title || '',
              students: []
            };
          }
          const p = profileMap.get(b.student_id);
          grouped[key].students.push({
            id: b.student_id,
            name: p ? `${p.first_name} ${p.last_name}` : 'Unknown',
            bookingId: b.id,
            bookingStatus: b.status
          });
        });
      });

      return Object.values(grouped).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    }
  });

  // Fetch upcoming bookings (next 7 days, excluding today)
  const { data: upcomingBookings } = useQuery({
    queryKey: ['chef-upcoming-batches', today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const weekAhead = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      // Get bookings assigned to this chef only
      const { data: assigned } = await supabase
        .from('bookings')
        .select(`id, student_id, recipe_id, time_slot, booking_date, recipes(title), courses(title)`)
        .gte('booking_date', tomorrow)
        .lte('booking_date', weekAhead)
        .eq('assigned_chef_id', user.id)
        .in('status', ['confirmed']);

      const all = assigned || [];

      // Group by date → time_slot + recipe
      const grouped: Record<string, { timeSlot: string; recipe: string; course: string; studentCount: number }[]> = {};
      all.forEach(b => {
        const d = b.booking_date;
        if (!grouped[d]) grouped[d] = [];
        const existing = grouped[d].find(e => e.timeSlot === b.time_slot && e.recipe === (b.recipes?.title || 'No Recipe'));
        if (existing) {
          existing.studentCount++;
        } else {
          grouped[d].push({
            timeSlot: b.time_slot,
            recipe: b.recipes?.title || 'No Recipe',
            course: b.courses?.title || '',
            studentCount: 1
          });
        }
      });

      // Sort dates
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, entries]) => ({ date, entries: entries.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)) }));
    }
  });


  const { data: ingredientSummary } = useQuery({
    queryKey: ['chef-daily-ingredients-summary', today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('recipe_id')
        .eq('booking_date', today)
        .eq('status', 'confirmed')
        .eq('assigned_chef_id', user.id)
        .not('recipe_id', 'is', null);

      if (!bookings?.length) return [];

      // Count students per recipe
      const recipeCounts: Record<string, number> = {};
      bookings.forEach(b => {
        if (b.recipe_id) {
          recipeCounts[b.recipe_id] = (recipeCounts[b.recipe_id] || 0) + 1;
        }
      });

      const recipeIds = Object.keys(recipeCounts);
      const { data: recipeIngredients } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, quantity_per_student, inventory:inventory_id(name, unit)')
        .in('recipe_id', recipeIds);

      // Aggregate
      const ingredientMap: Record<string, { name: string; unit: string; total: number }> = {};
      recipeIngredients?.forEach((ri: any) => {
        if (!ri.inventory) return;
        const key = ri.inventory.name;
        if (!ingredientMap[key]) {
          ingredientMap[key] = { name: ri.inventory.name, unit: ri.inventory.unit, total: 0 };
        }
        ingredientMap[key].total += ri.quantity_per_student * (recipeCounts[ri.recipe_id] || 0);
      });

      return Object.values(ingredientMap).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  // Confirm batch completion mutation (atomic server-side RPC)
  const confirmBatchMutation = useMutation({
    mutationFn: async (batchKey: string) => {
      const batch = todaysBatches?.find((_, i) => `batch-${i}` === batchKey);
      if (!batch) throw new Error('Batch not found');

      const batchAttendance = attendanceState[batchKey] || {};
      
      // Ensure all students are marked
      const confirmedStudents = batch.students.filter(s => s.bookingStatus === 'confirmed');
      const unmarked = confirmedStudents.filter(s => !batchAttendance[s.id]);
      if (unmarked.length > 0) {
        throw new Error(`Mark all students before confirming. ${unmarked.length} unmarked.`);
      }

      // Build attendance payload for atomic RPC
      const attendancePayload = confirmedStudents.map(s => ({
        student_id: s.id,
        booking_id: s.bookingId,
        status: batchAttendance[s.id]
      }));

      const { data, error } = await supabase.rpc('confirm_batch_completion', {
        p_batch_date: today,
        p_time_slot: batch.timeSlot,
        p_recipe_id: batch.recipeId,
        p_attendance: attendancePayload,
        p_session_notes: sessionNotes[batchKey] || null
      });

      if (error) throw error;
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        throw new Error(result?.message || 'Batch confirmation failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef-todays-batches'] });
      toast({ title: "Batch Completed", description: "Attendance confirmed and inventory deducted atomically." });
      setConfirmBatchId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setConfirmBatchId(null);
    }
  });

  const toggleAttendance = (batchKey: string, studentId: string, status: 'present' | 'absent') => {
    setAttendanceState(prev => ({
      ...prev,
      [batchKey]: {
        ...(prev[batchKey] || {}),
        [studentId]: status
      }
    }));
  };

  const totalStudents = todaysBatches?.reduce((sum, b) => sum + b.students.length, 0) || 0;
  const totalBatches = todaysBatches?.length || 0;
  const firstName = profile?.first_name || 'Chef';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="chef" userName={firstName} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" userName={`Chef ${firstName}`} />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{greeting}, Chef {firstName} 👨‍🍳</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6">
          <StatsCard title="Today's Batches" value={String(totalBatches)} icon={Calendar} variant="primary" />
          <StatsCard title="Total Students" value={String(totalStudents)} icon={Users} variant="success" />
          <StatsCard title="Ingredients Needed" value={String(ingredientSummary?.length || 0)} icon={Package} variant="default" />
        </div>

        {/* Daily Ingredient Summary — NO stock/cost info */}
        {ingredientSummary && ingredientSummary.length > 0 && (
          <Card className="p-4 md:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Daily Ingredient Requirements</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ingredientSummary.map((item, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-lg font-bold text-primary">{item.total.toFixed(1)} {item.unit}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Today's Batches with Attendance */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Today's Batches</h2>
          
          {todaysBatches?.length === 0 && (
            <Card className="p-8 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No batches scheduled for today</p>
            </Card>
          )}

          {todaysBatches?.map((batch, idx) => {
            const batchKey = `batch-${idx}`;
            const batchAttendance = attendanceState[batchKey] || {};
            const isCompleted = batch.students.every(s => s.bookingStatus === 'attended' || s.bookingStatus === 'no_show');
            const confirmedStudents = batch.students.filter(s => s.bookingStatus === 'confirmed');
            const allMarked = confirmedStudents.length > 0 && confirmedStudents.every(s => batchAttendance[s.id]);
            const presentCount = Object.values(batchAttendance).filter(v => v === 'present').length;
            const absentCount = Object.values(batchAttendance).filter(v => v === 'absent').length;

            return (
              <Card key={batchKey} className={`p-4 md:p-6 ${isCompleted ? 'opacity-60' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{batch.timeSlot}</Badge>
                      {isCompleted && <Badge className="bg-green-500">Completed</Badge>}
                    </div>
                    <h3 className="text-lg font-semibold">{batch.recipeTitle}</h3>
                    <p className="text-sm text-muted-foreground">{batch.courseName}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-green-500 font-bold text-lg">{presentCount}</div>
                      <div className="text-muted-foreground text-xs">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-bold text-lg">{absentCount}</div>
                      <div className="text-muted-foreground text-xs">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{batch.students.length}</div>
                      <div className="text-muted-foreground text-xs">Total</div>
                    </div>
                  </div>
                </div>

                {/* Student List */}
                <div className="space-y-2 mb-4">
                  {batch.students.map(student => {
                    const currentMark = batchAttendance[student.id];
                    const alreadyProcessed = student.bookingStatus === 'attended' || student.bookingStatus === 'no_show';
                    
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{student.name}</span>
                          {alreadyProcessed && (
                            <Badge className={student.bookingStatus === 'attended' ? 'bg-green-500' : 'bg-red-500'}>
                              {student.bookingStatus === 'attended' ? 'Present' : 'No Show'}
                            </Badge>
                          )}
                          {!alreadyProcessed && currentMark && (
                            <Badge className={currentMark === 'present' ? 'bg-green-500' : 'bg-red-500'}>
                              {currentMark === 'present' ? 'Present' : 'Absent'}
                            </Badge>
                          )}
                          {!alreadyProcessed && !currentMark && (
                            <Badge variant="outline" className="text-muted-foreground">Not Marked</Badge>
                          )}
                        </div>
                        {!alreadyProcessed && !isCompleted && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={currentMark === 'present' ? 'default' : 'outline'}
                              className={currentMark === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                              onClick={() => toggleAttendance(batchKey, student.id, 'present')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={currentMark === 'absent' ? 'default' : 'outline'}
                              className={currentMark === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                              onClick={() => toggleAttendance(batchKey, student.id, 'absent')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Session Notes */}
                {!isCompleted && (
                  <div className="mb-4">
                    <Textarea
                      placeholder="Session notes (optional): issues, observations..."
                      value={sessionNotes[batchKey] || ''}
                      onChange={e => setSessionNotes(prev => ({ ...prev, [batchKey]: e.target.value }))}
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                )}

                {/* Confirm Button */}
                {!isCompleted && (
                  <Button
                    className="w-full"
                    disabled={!allMarked || confirmBatchMutation.isPending}
                    onClick={() => setConfirmBatchId(batchKey)}
                  >
                    {confirmBatchMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Batch Completion</>
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {/* Upcoming Batches (Next 7 Days) */}
        {upcomingBookings && upcomingBookings.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Batches
            </h2>
            {upcomingBookings.map(day => (
              <div key={day.date}>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  {format(parseISO(day.date), 'EEEE, MMMM d')}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {day.entries.map((entry, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <Badge variant="outline">{entry.timeSlot}</Badge>
                      </div>
                      <h4 className="font-semibold mb-1">{entry.recipe}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{entry.course}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.studentCount} student{entry.studentCount !== 1 ? 's' : ''}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmBatchId} onOpenChange={() => setConfirmBatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Batch Completion</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize attendance, update recipe progress, deduct inventory for present students, and apply no-show rules. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmBatchId && confirmBatchMutation.mutate(confirmBatchId)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChefDashboard;
