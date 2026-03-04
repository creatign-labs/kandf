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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Search, Download, UserCircle, Loader2, Copy, Eye, EyeOff, CheckCircle, Clock, MonitorPlay, UserCheck, XCircle, Ban, Pencil, Trash2, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OnlineClassManager } from "@/components/admin/OnlineClassManager";
import { StudentViewDialog } from "@/components/admin/StudentViewDialog";
import { useSearchParams } from "react-router-dom";

const Students = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") === "awaiting" ? "awaiting" : "enrolled");
  const [onlineClassStudent, setOnlineClassStudent] = useState<{ id: string; name: string } | null>(null);
  const [viewEnrollment, setViewEnrollment] = useState<any>(null);
  const queryClient = useQueryClient();

  // Awaiting tab state
  const [awaitingSearch, setAwaitingSearch] = useState("");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectingStudent, setRejectingStudent] = useState<any>(null);
  const [editingApproval, setEditingApproval] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsStudent, setCredentialsStudent] = useState<any>(null);

  // Sync tab from URL
  useEffect(() => {
    if (searchParams.get("tab") === "awaiting") {
      setActiveTab("awaiting");
    }
  }, [searchParams]);

  // Fetch all enrollments with student profiles and courses
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`*, courses(id, title)`)
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

  // Fetch approval records (same data source as StudentApprovals page)
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["pending-student-approvals"],
    queryFn: async () => {
      const { data: approvals, error } = await supabase
        .from("student_access_approvals")
        .select(`
          *,
          advance_payments!student_access_approvals_advance_payment_id_fkey(
            *,
            courses(title)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const studentIds = approvals?.map(a => a.student_id) || [];
      if (studentIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", studentIds);

      return approvals?.map(approval => ({
        ...approval,
        profile: profiles?.find(p => p.id === approval.student_id),
      })) || [];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId?: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-student-with-password', {
        body: { student_id: studentId, course_id: courseId || undefined },
      });
      if (error) throw new Error(error.message || "Failed to call approval function");
      if (!data?.success) throw new Error(data?.error || "Failed to approve student");
      return { studentId, password: data.password, studentCode: data.studentCode };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      toast({ title: "Student Approved", description: "Account is now active. Password has been updated." });
      const student = pendingApprovals?.find(a => a.student_id === data.studentId);
      if (student) {
        setSelectedStudent({ ...student, generated_password: data.password, student_code: data.studentCode });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error: approvalError } = await supabase
        .from("student_access_approvals")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("student_id", studentId);
      if (approvalError) throw approvalError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ enrollment_status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", studentId);
      if (profileError) throw profileError;

      await supabase.from("notifications").insert({
        user_id: studentId,
        title: "Application Rejected",
        message: "Your application has been rejected. Please contact Admin for more details.",
        type: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      toast({ title: "Application Rejected", description: "The student has been notified." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete approval record mutation
  const deleteMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const { error } = await supabase
        .from("student_access_approvals")
        .delete()
        .eq("id", approvalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      toast({ title: "Record Deleted", description: "The approval record has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update approval status mutation
  const updateMutation = useMutation({
    mutationFn: async ({ approvalId, status }: { approvalId: string; status: string }) => {
      const { error } = await supabase
        .from("student_access_approvals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", approvalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      toast({ title: "Record Updated", description: "The approval status has been updated." });
      setEditingApproval(null);
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

  // Enrolled tab filters
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

  // Awaiting tab filters
  const filteredApprovals = useMemo(() => {
    if (!pendingApprovals) return [];
    return pendingApprovals.filter(approval => {
      const matchesSearch = 
        approval.profile?.first_name?.toLowerCase().includes(awaitingSearch.toLowerCase()) ||
        approval.profile?.last_name?.toLowerCase().includes(awaitingSearch.toLowerCase()) ||
        approval.profile?.phone?.includes(awaitingSearch);
      const matchesStatus = approvalStatusFilter === "all" || approval.status === approvalStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pendingApprovals, awaitingSearch, approvalStatusFilter]);

  const stats = useMemo(() => {
    if (!enrollments) return { total: 0, active: 0, completed: 0, onHold: 0 };
    return {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'active').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      onHold: enrollments.filter(e => e.status === 'on_hold').length,
    };
  }, [enrollments]);

  const pendingCount = pendingApprovals?.filter(a => a.status === "pending").length || 0;
  const approvedCount = pendingApprovals?.filter(a => a.status === "approved").length || 0;
  const rejectedCount = pendingApprovals?.filter(a => a.status === "rejected").length || 0;
  const awaitingCount = pendingApprovals?.length || 0;

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
    const name = student?.profile ? `${student.profile.first_name} ${student.profile.last_name}` : `${student.first_name} ${student.last_name}`;
    const email = student?.profile?.email || student.email;
    const text = `Student Credentials\n\nName: ${name}\nEmail: ${email}\nPassword: ${student.generated_password}${student.student_code ? `\nStudent ID: ${student.student_code}` : ''}\n\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast({ title: "All credentials copied!", description: "Ready to share via email or WhatsApp." });
  };

  const handleEditClick = (approval: any) => {
    setEditingApproval(approval);
    setEditStatus(approval.status);
  };

  const handleSaveEdit = () => {
    if (editingApproval && editStatus !== editingApproval.status) {
      updateMutation.mutate({ approvalId: editingApproval.id, status: editStatus });
    } else {
      setEditingApproval(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (editingApproval) {
      deleteMutation.mutate(editingApproval.id);
      setShowDeleteConfirm(false);
      setEditingApproval(null);
    }
  };

  const handleApproveStudent = (approval: any) => {
    const courseId = approval.advance_payments?.course_id;
    approveMutation.mutate({ studentId: approval.student_id, courseId: courseId || undefined });
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOnlineClassStudent({
                                id: enrollment.student_id,
                                name: `${enrollment.profile?.first_name || ''} ${enrollment.profile?.last_name || ''}`.trim(),
                              })}
                            >
                              <MonitorPlay className="h-4 w-4 mr-1" />
                              Online Class
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setViewEnrollment(enrollment)}>View</Button>
                          </div>
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

          {/* Awaiting Activation Tab - Full Approval Workflow */}
          <TabsContent value="awaiting">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Pending</div>
                <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Approved</div>
                <div className="text-2xl font-bold text-green-500">{approvedCount}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Rejected</div>
                <div className="text-2xl font-bold text-red-500">{rejectedCount}</div>
              </Card>
            </div>

            {/* Sub-filter Tabs and Search */}
            <Card className="p-4 mb-6">
              <Tabs value={approvalStatusFilter} onValueChange={(v) => setApprovalStatusFilter(v as any)} className="mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-10"
                  value={awaitingSearch}
                  onChange={(e) => setAwaitingSearch(e.target.value)}
                />
              </div>
            </Card>

            {/* Approvals Table */}
            <Card className="p-6">
              {!isSuperAdmin && (
                <p className="text-sm text-muted-foreground mb-4">
                  <Badge variant="outline" className="mr-2">View Only</Badge>
                  Only Super Admins can approve or reject students.
                </p>
              )}

              {approvalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals?.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {approval.profile?.first_name} {approval.profile?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {approval.profile?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {approval.advance_payments?.courses?.title || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={approval.advance_payments?.status === "paid" ? "default" : "secondary"}>
                            {approval.advance_payments?.status === "paid" ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                ₹{approval.advance_payments?.amount}
                              </>
                            ) : (
                              "Pending"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              approval.status === "approved" 
                                ? "default" 
                                : approval.status === "rejected" 
                                ? "destructive" 
                                : "outline"
                            }
                          >
                            {approval.status === "approved" ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : approval.status === "rejected" ? (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(approval.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {approval.status === "pending" && isSuperAdmin ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveStudent(approval)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Approve & Enroll
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingStudent(approval)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            ) : approval.status === "approved" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudent(approval)}
                              >
                                View Credentials
                              </Button>
                            ) : approval.status === "rejected" ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Application Rejected
                              </Badge>
                            ) : !isSuperAdmin ? (
                              <span className="text-sm text-muted-foreground">Super Admin only</span>
                            ) : null}
                            {isSuperAdmin && approval.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(approval)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredApprovals || filteredApprovals.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No approvals found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Credentials Dialog (from StudentApprovals) */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Student Name</label>
              <p className="text-lg">
                {selectedStudent?.profile?.first_name} {selectedStudent?.profile?.last_name}
              </p>
            </div>
            {selectedStudent?.student_code && (
              <div>
                <label className="text-sm font-medium">Student ID</label>
                <div className="flex items-center gap-2">
                  <Input value={selectedStudent.student_code} readOnly className="font-mono font-bold" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedStudent.student_code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <Input value={selectedStudent?.profile?.email || "N/A"} readOnly />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(selectedStudent?.profile?.email || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedStudent?.generated_password && (
              <div>
                <label className="text-sm font-medium">Generated Password</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={selectedStudent.generated_password}
                    readOnly
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedStudent.generated_password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share these credentials with the student securely
                </p>
              </div>
            )}
            <div className="pt-4 border-t flex gap-2">
              <Button className="flex-1 gap-2" onClick={() => copyAllCredentials(selectedStudent)}>
                <Copy className="h-4 w-4" />
                Copy All Credentials
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const name = `${selectedStudent?.profile?.first_name} ${selectedStudent?.profile?.last_name}`;
                  const email = selectedStudent?.profile?.email;
                  const text = `Student Credentials\n\nName: ${name}\nEmail: ${email}\nPassword: ${selectedStudent?.generated_password}${selectedStudent?.student_code ? `\nStudent ID: ${selectedStudent.student_code}` : ''}\n\nLogin at: ${window.location.origin}/login`;
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(whatsappUrl, '_blank');
                }}
              >
                Share via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingApproval} onOpenChange={() => setEditingApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Approval Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Student Name</Label>
              <p className="text-lg">
                {editingApproval?.profile?.first_name} {editingApproval?.profile?.last_name}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-muted-foreground">{editingApproval?.profile?.email || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Course</Label>
              <p className="text-muted-foreground">
                {editingApproval?.advance_payments?.courses?.title || "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-muted-foreground">
                {editingApproval?.created_at && format(new Date(editingApproval.created_at), "MMM d, yyyy h:mm a")}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1" 
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditingApproval(null)}
              >
                Cancel
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete this approval record. This action cannot be undone.
              </p>
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Approval Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the approval record for{" "}
              <strong>{editingApproval?.profile?.first_name} {editingApproval?.profile?.last_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog open={!!rejectingStudent} onOpenChange={() => setRejectingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Reject Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the application for{" "}
              <strong>{rejectingStudent?.profile?.first_name} {rejectingStudent?.profile?.last_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Card className="p-4 bg-destructive/5 border-destructive/20">
              <p className="text-sm text-muted-foreground">
                The student will be notified that their application has been rejected and will see:
              </p>
              <p className="text-sm font-medium mt-2 text-destructive">
                "Your application has been rejected. Please contact Admin for more details."
              </p>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingStudent(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectMutation.mutate(rejectingStudent.student_id);
                setRejectingStudent(null);
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Online Class Manager Dialog */}
      {onlineClassStudent && (
        <OnlineClassManager
          studentId={onlineClassStudent.id}
          studentName={onlineClassStudent.name}
          open={!!onlineClassStudent}
          onOpenChange={(open) => !open && setOnlineClassStudent(null)}
        />
      )}

      {/* Student View Dialog */}
      <StudentViewDialog
        enrollment={viewEnrollment}
        open={!!viewEnrollment}
        onOpenChange={(open) => !open && setViewEnrollment(null)}
        onManageOnlineClass={viewEnrollment ? () => setOnlineClassStudent({
          id: viewEnrollment.student_id,
          name: `${viewEnrollment.profile?.first_name || ''} ${viewEnrollment.profile?.last_name || ''}`.trim(),
        }) : undefined}
      />
    </div>
  );
};

export default Students;
