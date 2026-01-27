import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle, XCircle, Loader2, BarChart3, Lock, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { AttendanceStatsWidget } from "@/components/chef/AttendanceStatsWidget";

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

const Attendance = () => {
  const [courseFilter, setCourseFilter] = useState("all");
  const [showStats, setShowStats] = useState(true);
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["batches-with-locking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          courses (title)
        `);
      if (error) throw error;
      return data?.map(batch => ({
        ...batch,
        isLocked: isTimeSlotPassed(batch.time_slot)
      }));
    },
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          batches (
            batch_name,
            time_slot,
            courses (title)
          ),
          profiles:student_id (first_name, last_name)
        `)
        .order("class_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["all-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          profiles:student_id (first_name, last_name),
          batches (batch_name, time_slot, courses (title))
        `)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      batchId, 
      classDate, 
      status 
    }: { 
      studentId: string; 
      batchId: string; 
      classDate: string; 
      status: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: studentId,
          batch_id: batchId,
          class_date: classDate,
          status,
          marked_by: user?.id,
        }, {
          onConflict: "student_id,batch_id,class_date",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({ title: "Attendance marked successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleMarkAttendance = (studentId: string, batchId: string, status: string, isLocked: boolean) => {
    if (isLocked) {
      toast({
        title: "Attendance Locked",
        description: "This class has ended. Attendance can no longer be modified.",
        variant: "destructive",
      });
      return;
    }
    markAttendanceMutation.mutate({
      studentId,
      batchId,
      classDate: todayStr,
      status,
    });
  };

  // Group attendance by date and batch
  const attendanceByDateBatch = attendance?.reduce((acc, record) => {
    const key = `${record.class_date}-${record.batch_id}`;
    if (!acc[key]) {
      acc[key] = {
        date: record.class_date,
        batch: record.batches,
        students: [],
      };
    }
    acc[key].students.push({
      id: record.student_id,
      name: record.profiles ? `${record.profiles.first_name} ${record.profiles.last_name}` : "Unknown",
      status: record.status,
    });
    return acc;
  }, {} as Record<string, { date: string; batch: any; students: any[] }>) || {};

  const attendanceRecords = Object.values(attendanceByDateBatch);

  const filteredRecords = courseFilter === "all" 
    ? attendanceRecords
    : attendanceRecords.filter(r => r.batch?.courses?.title === courseFilter);

  // Calculate stats
  const totalClasses = attendanceRecords.length;
  const allStudents = attendance?.filter(a => a.status === "present").length || 0;
  const totalStudents = attendance?.length || 0;
  const avgAttendance = totalStudents > 0 ? Math.round((allStudents / totalStudents) * 100) : 0;

  const getAttendanceRate = (students: { status: string }[]) => {
    const present = students.filter(s => s.status === "present").length;
    return Math.round((present / students.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Attendance Management</h1>
          <p className="text-muted-foreground">
            Mark today's attendance and view historical records
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={showStats ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showStats ? "Hide Statistics" : "Show Statistics"}
            </Button>
          </div>
        </div>

        {showStats && attendance && (
          <div className="mb-6">
            <AttendanceStatsWidget attendance={attendance} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalClasses}</div>
                <div className="text-sm text-muted-foreground">Total Classes</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-500">{avgAttendance}%</div>
                <div className="text-sm text-muted-foreground">Avg Attendance</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-500">{batches?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Active Batches</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-500">{enrollments?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Mark Today's Attendance */}
        {enrollments && enrollments.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Mark Today's Attendance</h2>
              <Badge variant="outline">{format(new Date(), "MMMM d, yyyy")}</Badge>
            </div>
            
            <div className="space-y-4">
              {batches?.map(batch => {
                const batchEnrollments = enrollments.filter(e => e.batch_id === batch.id);
                if (batchEnrollments.length === 0) return null;

                return (
                  <Card key={batch.id} className={`p-4 ${batch.isLocked ? 'opacity-75' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{batch.batch_name}</h3>
                          {batch.isLocked && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {batch.courses?.title} • {batch.time_slot}
                        </p>
                      </div>
                      {batch.isLocked && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="h-4 w-4" />
                          Class ended
                        </div>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">Mark Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchEnrollments.map(enrollment => {
                          const existingAttendance = attendance?.find(
                            a => a.student_id === enrollment.student_id && 
                                 a.batch_id === batch.id && 
                                 a.class_date === todayStr
                          );
                          const profile = (enrollment as any).profiles;
                          
                          return (
                            <TableRow key={enrollment.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{profile?.first_name} {profile?.last_name}</span>
                                  {existingAttendance && (
                                    <Badge 
                                      className={
                                        existingAttendance.status === "present" 
                                          ? "bg-green-500" 
                                          : existingAttendance.status === "absent"
                                          ? "bg-red-500"
                                          : "bg-orange-500"
                                      }
                                    >
                                      {existingAttendance.status === "present" ? "Present" : 
                                       existingAttendance.status === "absent" ? "Absent" : "No Show"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant={existingAttendance?.status === "present" ? "default" : "outline"}
                                    className={existingAttendance?.status === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                                    onClick={() => handleMarkAttendance(
                                      enrollment.student_id, 
                                      batch.id, 
                                      "present",
                                      batch.isLocked
                                    )}
                                    disabled={batch.isLocked || markAttendanceMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Present
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={existingAttendance?.status === "absent" ? "default" : "outline"}
                                    className={existingAttendance?.status === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                                    onClick={() => handleMarkAttendance(
                                      enrollment.student_id, 
                                      batch.id, 
                                      "absent",
                                      batch.isLocked
                                    )}
                                    disabled={batch.isLocked || markAttendanceMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Absent
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                );
              })}
            </div>
          </Card>
        )}

        {/* Attendance History */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.title}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-xl font-bold mb-4">Attendance History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="space-y-4">
              {filteredRecords.slice(0, 10).map((record, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-lg">
                          {format(new Date(record.date), "MMM d, yyyy")}
                        </span>
                        <Badge>{record.batch?.time_slot}</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {record.batch?.courses?.title} • {record.batch?.batch_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-500">
                        {getAttendanceRate(record.students)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Attendance Rate</div>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {record.students.map((student, sIndex) => (
                          <TableRow key={sIndex}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {student.status === "present" ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge className="bg-green-500">Present</Badge>
                                  </>
                                ) : student.status === "no_show" ? (
                                  <>
                                    <XCircle className="h-4 w-4 text-orange-500" />
                                    <Badge className="bg-orange-500">No Show</Badge>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <Badge className="bg-red-500">Absent</Badge>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No attendance records</h3>
              <p className="text-muted-foreground">Start marking attendance for your classes.</p>
            </Card>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Attendance;
