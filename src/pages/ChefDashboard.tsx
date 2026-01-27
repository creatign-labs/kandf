import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle2, Clock, Loader2, ChefHat, XCircle, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Helper to check if a time slot has passed
const isTimeSlotPassed = (timeSlot: string): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Extract end time from slot (e.g., "9:00 AM - 12:00 PM" -> "12:00 PM")
  const endTimeMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (!endTimeMatch) return false;
  
  let hour = parseInt(endTimeMatch[1]);
  const minute = parseInt(endTimeMatch[2]);
  const period = endTimeMatch[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  
  // Compare with current time
  if (currentHour > hour) return true;
  if (currentHour === hour && currentMinute > minute) return true;
  return false;
};

const ChefDashboard = () => {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch chef profile
  const { data: profile } = useQuery({
    queryKey: ['chef-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch today's bookings grouped by recipe
  const { data: todaysBookings } = useQuery({
    queryKey: ['todays-bookings-by-recipe', today],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          course_id,
          recipe_id,
          time_slot,
          recipes(id, title),
          courses(title)
        `)
        .eq('booking_date', today)
        .eq('status', 'confirmed');
      
      if (error) throw error;
      
      // Fetch profiles for all students in bookings
      const studentIds = [...new Set((bookings || []).map(b => b.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return (bookings || []).map(b => ({
        ...b,
        profile: profileMap.get(b.student_id)
      }));
    }
  });

  // Fetch today's batches with enrollments
  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['todays-batches', today],
    queryFn: async () => {
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('*, courses(title)')
        .order('time_slot');
      
      if (batchesError) throw batchesError;

      // Fetch enrollments with profiles for each batch
      const batchesWithStudents = await Promise.all(
        (batches || []).map(async (batch) => {
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('*, profiles:student_id(id, first_name, last_name)')
            .eq('batch_id', batch.id)
            .eq('status', 'active');
          
          if (enrollmentsError) throw enrollmentsError;

          // Fetch today's attendance for this batch
          const { data: attendance, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', batch.id)
            .eq('class_date', today);
          
          if (attendanceError) throw attendanceError;

          return {
            ...batch,
            enrollments: enrollments || [],
            attendance: attendance || [],
            isLocked: isTimeSlotPassed(batch.time_slot)
          };
        })
      );

      return batchesWithStudents;
    }
  });

  // Fetch low stock items for quick visibility
  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .lt('current_stock', 10)
        .order('current_stock')
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  // Group bookings by time slot and recipe
  const groupedBySlotAndRecipe = todaysBookings?.reduce((acc, booking) => {
    const slot = booking.time_slot;
    const recipeId = booking.recipe_id || 'unassigned';
    const recipeTitle = booking.recipes?.title || 'No Recipe Assigned';
    
    if (!acc[slot]) acc[slot] = {};
    if (!acc[slot][recipeId]) {
      acc[slot][recipeId] = {
        recipeTitle,
        students: []
      };
    }
    
    acc[slot][recipeId].students.push({
      id: booking.profile?.id,
      name: `${booking.profile?.first_name || ''} ${booking.profile?.last_name || ''}`.trim(),
      courseName: booking.courses?.title
    });
    
    return acc;
  }, {} as Record<string, Record<string, { recipeTitle: string; students: { id: string | undefined; name: string; courseName: string | undefined }[] }>>);

  // Mark attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ studentId, batchId, status }: { studentId: string; batchId: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if attendance record exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .eq('class_date', today)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update({ status, marked_by: user.id })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({
            student_id: studentId,
            batch_id: batchId,
            class_date: today,
            status,
            marked_by: user.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-batches'] });
      toast({
        title: "Attendance marked",
        description: "The attendance has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMarkAttendance = (studentId: string, batchId: string, status: 'present' | 'absent', isLocked: boolean) => {
    if (isLocked) {
      toast({
        title: "Attendance Locked",
        description: "This class has ended. Attendance can no longer be modified.",
        variant: "destructive",
      });
      return;
    }
    attendanceMutation.mutate({ studentId, batchId, status });
  };

  const getStudentStatus = (studentId: string, attendance: any[]) => {
    const record = attendance.find(a => a.student_id === studentId);
    return record?.status || null;
  };

  const totalStudents = batchesData?.reduce((sum, batch) => sum + batch.enrollments.length, 0) || 0;
  const totalBatches = batchesData?.length || 0;
  const lockedClasses = batchesData?.filter(b => b.isLocked).length || 0;

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
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{greeting}, Chef {firstName} 👨‍🍳</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")} • Manage your classes and mark attendance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatsCard
            title="Today's Classes"
            value={String(totalBatches)}
            icon={Calendar}
            variant="primary"
          />
          <StatsCard
            title="Total Students"
            value={String(totalStudents)}
            icon={Users}
            variant="success"
          />
          <StatsCard
            title="Classes Ended"
            value={String(lockedClasses)}
            icon={Lock}
            variant="default"
          />
          <StatsCard
            title="Low Stock Items"
            value={String(lowStockItems?.length || 0)}
            icon={CheckCircle2}
            variant={lowStockItems && lowStockItems.length > 0 ? "warning" : "default"}
          />
        </div>

        {/* Today's Recipe Groupings */}
        {groupedBySlotAndRecipe && Object.keys(groupedBySlotAndRecipe).length > 0 && (
          <Card className="p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Today's Recipe Groups</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(groupedBySlotAndRecipe).map(([slot, recipes]) => (
                <div key={slot} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{slot}</Badge>
                    {isTimeSlotPassed(slot) && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" /> Ended
                      </Badge>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(recipes).map(([recipeId, data]) => (
                      <div 
                        key={recipeId} 
                        className={`p-3 rounded-lg ${recipeId === 'unassigned' ? 'bg-muted/50 border-dashed border' : 'bg-primary/5 border border-primary/20'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ChefHat className={`h-4 w-4 ${recipeId === 'unassigned' ? 'text-muted-foreground' : 'text-primary'}`} />
                          <span className={`font-medium text-sm ${recipeId === 'unassigned' ? 'text-muted-foreground italic' : ''}`}>
                            {data.recipeTitle}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {data.students.map((student, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {student.name || 'Unknown'}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {data.students.length} student{data.students.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Classes Schedule with Attendance */}
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-xl font-semibold">Mark Attendance</h2>
          
          {batchesData?.map((batch) => {
            const presentCount = batch.attendance.filter((a: any) => a.status === 'present').length;
            const absentCount = batch.attendance.filter((a: any) => a.status === 'absent').length;
            
            return (
              <Card key={batch.id} className={`p-4 md:p-6 ${batch.isLocked ? 'opacity-75' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 md:mb-6 gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="default">
                        {batch.time_slot}
                      </Badge>
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">{batch.days}</span>
                      {batch.isLocked && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold mb-1">{batch.courses?.title}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">{batch.batch_name}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-500 font-bold text-lg">{presentCount}</div>
                      <div className="text-muted-foreground text-xs">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-bold text-lg">{absentCount}</div>
                      <div className="text-muted-foreground text-xs">Absent</div>
                    </div>
                  </div>
                </div>

                {/* Student Roster */}
                <div>
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="font-semibold text-sm md:text-base">Student Roster ({batch.enrollments.length})</h3>
                  </div>
                  
                  {batch.enrollments.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-2 md:gap-3">
                      {batch.enrollments.map((enrollment: any) => {
                        const status = getStudentStatus(enrollment.student_id, batch.attendance);
                        
                        return (
                          <div
                            key={enrollment.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border bg-card transition-colors ${batch.isLocked ? '' : 'hover:bg-accent/5'}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                                </span>
                                {status === 'present' && (
                                  <Badge className="bg-green-500 text-white">Present</Badge>
                                )}
                                {status === 'absent' && (
                                  <Badge className="bg-red-500 text-white">Absent</Badge>
                                )}
                                {status === 'no_show' && (
                                  <Badge className="bg-orange-500 text-white">No Show</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={status === 'present' ? 'default' : 'outline'}
                                className={status === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                                onClick={() => handleMarkAttendance(enrollment.student_id, batch.id, 'present', batch.isLocked)}
                                disabled={batch.isLocked || attendanceMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={status === 'absent' ? 'default' : 'outline'}
                                className={status === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                                onClick={() => handleMarkAttendance(enrollment.student_id, batch.id, 'absent', batch.isLocked)}
                                disabled={batch.isLocked || attendanceMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Absent
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No students enrolled in this batch
                    </p>
                  )}
                </div>
              </Card>
            );
          })}

          {(!batchesData || batchesData.length === 0) && (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Today</h3>
              <p className="text-muted-foreground">You don't have any classes scheduled for today.</p>
            </Card>
          )}
        </div>

        {/* Low Stock Alert */}
        {lowStockItems && lowStockItems.length > 0 && (
          <Card className="p-6 mt-8 border-yellow-500/50 bg-yellow-500/5">
            <h3 className="font-semibold mb-4 text-yellow-600 dark:text-yellow-400">Low Stock Alert</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between p-3 border rounded-lg bg-background">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({item.category})</span>
                  </div>
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {item.current_stock} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChefDashboard;
