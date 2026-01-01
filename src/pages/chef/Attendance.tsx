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
import { Calendar, Download, CheckCircle, XCircle, Loader2, BarChart3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { AttendanceStatsWidget } from "@/components/chef/AttendanceStatsWidget";

const Attendance = () => {
  const [courseFilter, setCourseFilter] = useState("all");
  const [showStats, setShowStats] = useState(true);
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          courses (title)
        `);
      if (error) throw error;
      return data;
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
      toast({ title: "Attendance marked" });
    },
  });

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

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" userName="Chef" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Attendance Management</h1>
          <p className="text-muted-foreground">Mark and view attendance records</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Classes</div>
            <div className="text-3xl font-bold text-foreground">{totalClasses}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Average Attendance</div>
            <div className="text-3xl font-bold text-green-500">{avgAttendance}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Batches</div>
            <div className="text-3xl font-bold text-blue-500">{batches?.length || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Students Enrolled</div>
            <div className="text-3xl font-bold text-purple-500">{enrollments?.length || 0}</div>
          </Card>
        </div>

        {/* Mark Today's Attendance */}
        {enrollments && enrollments.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Mark Today's Attendance</h2>
            <div className="space-y-4">
              {batches?.map(batch => {
                const batchEnrollments = enrollments.filter(e => e.batch_id === batch.id);
                if (batchEnrollments.length === 0) return null;

                return (
                  <Card key={batch.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{batch.batch_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {batch.courses?.title} • {batch.time_slot}
                        </p>
                      </div>
                      <Badge>{format(new Date(), "MMM d, yyyy")}</Badge>
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
                                {profile?.first_name} {profile?.last_name}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant={existingAttendance?.status === "present" ? "default" : "outline"}
                                    className={existingAttendance?.status === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                                    onClick={() => markAttendanceMutation.mutate({
                                      studentId: enrollment.student_id,
                                      batchId: batch.id,
                                      classDate: todayStr,
                                      status: "present",
                                    })}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Present
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={existingAttendance?.status === "absent" ? "default" : "outline"}
                                    className={existingAttendance?.status === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                                    onClick={() => markAttendanceMutation.mutate({
                                      studentId: enrollment.student_id,
                                      batchId: batch.id,
                                      classDate: todayStr,
                                      status: "absent",
                                    })}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Absent
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={existingAttendance?.status === "no_show" ? "default" : "outline"}
                                    className={existingAttendance?.status === "no_show" ? "bg-orange-500 hover:bg-orange-600" : ""}
                                    onClick={() => markAttendanceMutation.mutate({
                                      studentId: enrollment.student_id,
                                      batchId: batch.id,
                                      classDate: todayStr,
                                      status: "no_show",
                                    })}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    No Show
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

        <Card className="p-6 mb-6">
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
            <Button variant="outline" className="gap-2 ml-auto">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          <h2 className="text-xl font-bold mb-4">Attendance History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="space-y-4">
              {filteredRecords.map((record, index) => (
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
