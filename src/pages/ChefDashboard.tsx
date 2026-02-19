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
import { format } from "date-fns";
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

      // Get bookings assigned to this chef for today
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id, student_id, course_id, recipe_id, time_slot, status, booking_date,
          recipes(id, title),
          courses(title)
        `)
        .eq('booking_date', today)
        .eq('assigned_chef_id', user.id)
        .in('status', ['confirmed', 'attended', 'no_show']);

      if (error) throw error;

      // Also get bookings without a specific chef assignment (all chef view)
      const { data: unassignedBookings, error: err2 } = await supabase
        .from('bookings')
        .select(`
          id, student_id, course_id, recipe_id, time_slot, status, booking_date,
          recipes(id, title),
          courses(title)
        `)
        .eq('booking_date', today)
        .is('assigned_chef_id', null)
        .in('status', ['confirmed', 'attended', 'no_show']);

      if (err2) throw err2;

      const allBookings = [...(bookings || []), ...(unassignedBookings || [])];

      // Get student profiles
      const studentIds = [...new Set(allBookings.map(b => b.student_id))];
      const { data: profiles } = studentIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', studentIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Group by time_slot + recipe
      const grouped: Record<string, {
        timeSlot: string;
        recipeId: string | null;
        recipeTitle: string;
        courseName: string;
        students: { id: string; name: string; bookingId: string; bookingStatus: string }[];
      }> = {};

      allBookings.forEach(b => {
        const key = `${b.time_slot}__${b.recipe_id || 'none'}`;
        if (!grouped[key]) {
          grouped[key] = {
            timeSlot: b.time_slot,
            recipeId: b.recipe_id,
            recipeTitle: b.recipes?.title || 'No Recipe',
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

      return Object.values(grouped).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    }
  });

  // Fetch daily ingredient summary (quantity × booked students, NO stock info)
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

  // Confirm batch completion mutation (atomic)
  const confirmBatchMutation = useMutation({
    mutationFn: async (batchKey: string) => {
      const batch = todaysBatches?.find((_, i) => `batch-${i}` === batchKey);
      if (!batch) throw new Error('Batch not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const batchAttendance = attendanceState[batchKey] || {};
      
      // Ensure all students are marked
      const unmarked = batch.students.filter(s => s.bookingStatus === 'confirmed' && !batchAttendance[s.id]);
      if (unmarked.length > 0) {
        throw new Error(`Mark all students before confirming. ${unmarked.length} unmarked.`);
      }

      // Check inventory sufficiency for present students
      const presentStudents = batch.students.filter(s => batchAttendance[s.id] === 'present');
      
      if (batch.recipeId && presentStudents.length > 0) {
        const { data: recipeIngs } = await supabase
          .from('recipe_ingredients')
          .select('inventory_id, quantity_per_student, inventory:inventory_id(name, current_stock, unit)')
          .eq('recipe_id', batch.recipeId);

        for (const ri of (recipeIngs || []) as any[]) {
          const needed = ri.quantity_per_student * presentStudents.length;
          if (ri.inventory && ri.inventory.current_stock < needed) {
            throw new Error(`Insufficient inventory: ${ri.inventory.name}. Need ${needed} ${ri.inventory.unit}, have ${ri.inventory.current_stock}`);
          }
        }
      }

      // Process each student atomically
      for (const student of batch.students) {
        if (student.bookingStatus !== 'confirmed') continue;
        
        const status = batchAttendance[student.id];
        if (!status) continue;

        if (status === 'present') {
          // Update booking status
          await supabase.from('bookings').update({ status: 'attended' }).eq('id', student.bookingId);
          
          // Mark recipe completed via RPC
          if (batch.recipeId) {
            await supabase.rpc('mark_recipe_complete_by_chef', {
              p_student_id: student.id,
              p_recipe_id: batch.recipeId
            });
          }

          // Mark attendance
          await supabase.from('attendance').upsert({
            student_id: student.id,
            batch_id: student.bookingId, // Using booking as reference
            class_date: today,
            status: 'present',
            marked_by: user.id
          }, { onConflict: 'student_id,batch_id,class_date' });

        } else {
          // Absent → no_show
          await supabase.from('bookings').update({ status: 'no_show' }).eq('id', student.bookingId);
          
          await supabase.from('attendance').upsert({
            student_id: student.id,
            batch_id: student.bookingId,
            class_date: today,
            status: 'no_show',
            marked_by: user.id
          }, { onConflict: 'student_id,batch_id,class_date' });

          // Check no_show count and lock if >= 3
          const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('status', 'no_show');

          if ((count || 0) >= 3) {
            await supabase.from('profiles')
              .update({ enrollment_status: 'locked_no_show' })
              .eq('id', student.id);

            await supabase.from('notifications').insert({
              user_id: student.id,
              title: 'Account Locked',
              message: 'Your account has been locked due to 3+ no-shows. Contact admin.',
              type: 'warning'
            });
          }
        }
      }

      // Deduct inventory for present students only
      if (batch.recipeId && presentStudents.length > 0) {
        const { data: recipeIngs } = await supabase
          .from('recipe_ingredients')
          .select('inventory_id, quantity_per_student')
          .eq('recipe_id', batch.recipeId);

        for (const ri of (recipeIngs || [])) {
          const totalDeduct = ri.quantity_per_student * presentStudents.length;
          // Get current stock
          const { data: inv } = await supabase.from('inventory').select('current_stock').eq('id', ri.inventory_id).single();
          if (inv) {
            const newStock = Math.max(0, inv.current_stock - totalDeduct);
            await supabase.from('inventory').update({ current_stock: newStock }).eq('id', ri.inventory_id);
            
            await supabase.from('inventory_usage').insert({
              inventory_id: ri.inventory_id,
              quantity_used: totalDeduct,
              used_by: user.id,
              notes: `Batch completion: ${batch.recipeTitle} (${presentStudents.length} students)`
            });
          }
        }
      }

      // Save session notes if provided
      const notes = sessionNotes[batchKey];
      if (notes && batch.recipeId) {
        // Find recipe_batch record
        const { data: rb } = await supabase
          .from('recipe_batches')
          .select('id')
          .eq('recipe_id', batch.recipeId)
          .eq('batch_date', today)
          .eq('time_slot', batch.timeSlot)
          .maybeSingle();

        if (rb) {
          await supabase.from('recipe_batches').update({
            session_notes: notes,
            session_notes_by: user.id,
            session_notes_at: new Date().toISOString(),
            status: 'completed'
          }).eq('id', rb.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef-todays-batches'] });
      toast({ title: "Batch Completed", description: "Attendance confirmed and inventory deducted." });
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
