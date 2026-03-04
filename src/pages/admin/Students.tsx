import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, UserCircle, Loader2, Key, Copy, Eye, EyeOff, CheckCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Students = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [activeTab, setActiveTab] = useState("enrolled");
  const [awaitingSearch, setAwaitingSearch] = useState("");
  const [credentialsStudent, setCredentialsStudent] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all enrollments with student profiles and courses
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses(id, title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const enrollmentsWithProfiles = await Promise.all(
        (data || []).map(async (enrollment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone, email')
            .eq('id', enrollment.student_id)
            .maybeSingle();
          return { ...enrollment, profile };
        })
      );
      return enrollmentsWithProfiles;
    }
  });

  // Fetch students awaiting activation (enrolled status, no enrollment yet)
  const { data: awaitingStudents, isLoading: awaitingLoading } = useQuery({
    queryKey: ['awaiting-activation-students'],
    queryFn: async () => {
      // Get profiles with enrolled status
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('enrollment_status', 'enrolled')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const studentIds = profiles?.map(p => p.id) || [];
      if (studentIds.length === 0) return [];

      // Get their approval records for credential info
      const { data: approvals } = await supabase
        .from('student_access_approvals')
        .select('*')
        .in('student_id', studentIds);

      // Get advance payments to find course info
      const { data: advancePayments } = await supabase
        .from('advance_payments')
        .select('student_id, course_id, courses(id, title)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      return profiles?.map(profile => ({
        ...profile,
        approval: approvals?.find(a => a.student_id === profile.id),
        advance_payment: advancePayments?.find(ap => ap.student_id === profile.id),
      })) || [];
    }
  });

  // Check if current user is super_admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin-students"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      return !!data;
    },
  });

  // Generate credentials mutation
  const generateCredentialsMutation = useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId?: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-student-with-password', {
        body: { student_id: studentId, course_id: courseId || undefined },
      });
      if (error) throw new Error(error.message || "Failed to generate credentials");
      if (!data?.success) throw new Error(data?.error || "Failed to generate credentials");
      return { studentId, password: data.password, studentCode: data.studentCode };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awaiting-activation-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      const student = awaitingStudents?.find(s => s.id === data.studentId);
      if (student) {
        setCredentialsStudent({
          ...student,
          generated_password: data.password,
          student_code: data.studentCode,
        });
      }
      toast({ title: "Credentials Generated", description: "Student activated. Copy and share the credentials." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Fetch unique courses for filter
  const { data: courses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.filter((enrollment) => {
      const fullName = `${enrollment.profile?.first_name || ''} ${enrollment.profile?.last_name || ''}`.toLowerCase();
      const phone = enrollment.profile?.phone?.toLowerCase() || '';
      const matchesSearch = searchQuery === "" || 
        fullName.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase());
      const matchesCourse = courseFilter === "all" || enrollment.courses?.id === courseFilter;
      const matchesStatus = statusFilter === "all-status" || 
        (statusFilter === "active" && enrollment.status === "active") ||
        (statusFilter === "completed" && enrollment.status === "completed") ||
        (statusFilter === "onhold" && enrollment.status === "on_hold");
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [enrollments, searchQuery, courseFilter, statusFilter]);

  const filteredAwaiting = useMemo(() => {
    if (!awaitingStudents) return [];
    return awaitingStudents.filter((student) => {
      const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
      const phone = student.phone?.toLowerCase() || '';
      return awaitingSearch === "" || 
        fullName.includes(awaitingSearch.toLowerCase()) ||
        phone.includes(awaitingSearch.toLowerCase());
    });
  }, [awaitingStudents, awaitingSearch]);

  const stats = useMemo(() => {
    if (!enrollments) return { total: 0, active: 0, completed: 0, onHold: 0 };
    return {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'active').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      onHold: enrollments.filter(e => e.status === 'on_hold').length,
    };
  }, [enrollments]);

  const awaitingCount = awaitingStudents?.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "on_hold": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "completed": return "Completed";
      case "on_hold": return "On Hold";
      default: return status;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const copyAllCredentials = (student: any) => {
    const text = `Student Credentials\n\nName: ${student.first_name} ${student.last_name}\nEmail: ${student.email}\nPassword: ${student.generated_password}${student.student_code ? `\nStudent ID: ${student.student_code}` : ''}\n\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast({ title: "All credentials copied!", description: "Ready to share via email or WhatsApp." });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Student Management</h1>
          <p className="text-muted-foreground">View and manage all students</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Enrolled</div>
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Active</div>
            <div className="text-3xl font-bold text-green-500">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-500">{stats.completed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">On Hold</div>
            <div className="text-3xl font-bold text-yellow-500">{stats.onHold}</div>
          </Card>
          <Card className="p-4 border-orange-200">
            <div className="text-sm text-muted-foreground mb-1">Awaiting Activation</div>
            <div className="text-3xl font-bold text-orange-500">{awaitingCount}</div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="enrolled">Enrolled Students ({stats.total})</TabsTrigger>
            <TabsTrigger value="awaiting">
              Awaiting Activation
              {awaitingCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                  {awaitingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Enrolled Students Tab */}
          <TabsContent value="enrolled">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or phone..." 
                    className="pl-10" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="onhold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                            <span className="font-medium">
                              {enrollment.profile?.first_name} {enrollment.profile?.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {enrollment.profile?.phone || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{enrollment.courses?.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${enrollment.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm">{enrollment.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(enrollment.status)}>
                            {getStatusLabel(enrollment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEnrollments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Awaiting Activation Tab */}
          <TabsContent value="awaiting">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or phone..." 
                    className="pl-10" 
                    value={awaitingSearch}
                    onChange={(e) => setAwaitingSearch(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Students who have paid their enrollment fee and are waiting for credential generation and course activation.
              </p>

              {awaitingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAwaiting.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-8 w-8 text-muted-foreground" />
                              <span className="font-medium">
                                {student.first_name} {student.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{student.email || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{student.phone || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {(student.advance_payment?.courses as any)?.title || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {student.approval?.status === "approved" ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />Activated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">
                                <Clock className="h-3 w-3 mr-1" />Awaiting Activation
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(student.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {student.approval?.status === "approved" && student.approval?.generated_password ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCredentialsStudent({
                                    ...student,
                                    generated_password: student.approval.generated_password,
                                  })}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Credentials
                                </Button>
                              ) : isSuperAdmin ? (
                                <Button
                                  size="sm"
                                  onClick={() => generateCredentialsMutation.mutate({ 
                                    studentId: student.id, 
                                    courseId: student.advance_payment?.course_id || undefined 
                                  })}
                                  disabled={generateCredentialsMutation.isPending}
                                >
                                  {generateCredentialsMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <Key className="h-4 w-4 mr-1" />
                                  )}
                                  Generate Credentials
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">Super Admin only</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAwaiting.length === 0 && (
                        <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No students awaiting activation
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsStudent} onOpenChange={() => { setCredentialsStudent(null); setShowPassword(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Credentials</DialogTitle>
            <DialogDescription>
              Copy and share these credentials with the student via email or WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {credentialsStudent && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <div className="flex items-center justify-between bg-muted/50 rounded-md p-3 mt-1">
                    <span className="font-medium">{credentialsStudent.first_name} {credentialsStudent.last_name}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center justify-between bg-muted/50 rounded-md p-3 mt-1">
                    <span className="font-mono text-sm">{credentialsStudent.email}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(credentialsStudent.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Password</label>
                  <div className="flex items-center justify-between bg-muted/50 rounded-md p-3 mt-1">
                    <span className="font-mono text-sm">
                      {showPassword ? credentialsStudent.generated_password : "••••••••••••"}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentialsStudent.generated_password)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {credentialsStudent.student_code && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                    <div className="flex items-center justify-between bg-muted/50 rounded-md p-3 mt-1">
                      <span className="font-mono text-sm">{credentialsStudent.student_code}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentialsStudent.student_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => copyAllCredentials(credentialsStudent)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Credentials
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const text = `Student Credentials\n\nName: ${credentialsStudent.first_name} ${credentialsStudent.last_name}\nEmail: ${credentialsStudent.email}\nPassword: ${credentialsStudent.generated_password}${credentialsStudent.student_code ? `\nStudent ID: ${credentialsStudent.student_code}` : ''}\n\nLogin at: ${window.location.origin}/login`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  Share via WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
