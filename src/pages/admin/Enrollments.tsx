import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, UserPlus, Phone, Calendar, CheckCircle, Copy } from "lucide-react";
import { format } from "date-fns";

const AdminEnrollments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    courseId: string;
    courseFee: number;
  } | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    password: string;
    studentCode: string;
  } | null>(null);

  // Custom payment schedule state
  const [customPaymentSchedule, setCustomPaymentSchedule] = useState({
    balance1Amount: 0,
    balance1DueDate: "",
    balance2Amount: 0,
    balance2DueDate: "",
  });

  // Form state for new enrollment
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    courseId: "",
    batchId: "",
    dateOfJoining: "",
  });

  // Fetch courses
  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, base_fee")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches for selected course
  const { data: batches } = useQuery({
    queryKey: ["admin-batches", formData.courseId],
    queryFn: async () => {
      if (!formData.courseId) return [];
      const { data, error } = await supabase
        .from("batches")
        .select("id, batch_name, start_date, available_seats")
        .eq("course_id", formData.courseId)
        .gt("available_seats", 0)
        .order("start_date");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.courseId,
  });

  // Fetch pending enrollments (advance payments awaiting completion)
  const { data: pendingEnrollments, isLoading } = useQuery({
    queryKey: ["admin-pending-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advance_payments")
        .select(`
          *,
          courses(id, title, base_fee)
        `)
        .in("status", ["pending", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for each payment
      const paymentsWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, phone, enrollment_status")
            .eq("id", payment.student_id)
            .maybeSingle();
          return { ...payment, profile };
        })
      );
      
      return paymentsWithProfiles;
    },
  });

  // Check if current user is super admin (only super admins can approve students)
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return false;

      const { data, error } = await supabase.rpc("is_super_admin", { _user_id: userId });
      if (error) throw error;
      return data === true;
    },
  });

  // Create student mutation using edge function
  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("admin-create-student", {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          courseId: data.courseId,
          dateOfJoining: data.dateOfJoining,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create student");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return {
        email: data.email,
        studentName: `${data.firstName} ${data.lastName}`,
        studentId: response.data.studentId,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-enrollments"] });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        courseId: "",
        batchId: "",
        dateOfJoining: "",
      });
      setIsCreateDialogOpen(false);
      toast({
        title: "Student Enrolled",
        description: `${result.studentName} has been enrolled. They will receive credentials upon approval.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve student mutation
  const approveStudentMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      courseId,
      paymentSchedule 
    }: { 
      studentId: string; 
      courseId: string;
      paymentSchedule: {
        balance1Amount: number;
        balance1DueDate: string;
        balance2Amount: number;
        balance2DueDate: string;
      };
    }) => {
      const response = await supabase.functions.invoke("approve-student-with-password", {
        body: { 
          student_id: studentId, 
          course_id: courseId,
          payment_schedule: paymentSchedule,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to approve student");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-enrollments"] });
      setApprovalResult({
        password: data.password,
        studentCode: data.studentCode,
      });
      toast({
        title: "Student Approved",
        description: "The student has been activated and credentials generated.",
      });
    },
    onError: (error: Error) => {
      setApproveDialogOpen(false);
      setSelectedStudent(null);
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApproveClick = (enrollment: any) => {
    const courseFee = enrollment.courses?.base_fee || 0;
    const remainingAmount = courseFee - 2000; // After registration fee
    const defaultBalance1 = Math.round(remainingAmount / 2);
    const defaultBalance2 = remainingAmount - defaultBalance1;
    
    // Calculate default dates (7 and 30 days from now)
    const today = new Date();
    const balance1Date = new Date(today);
    balance1Date.setDate(balance1Date.getDate() + 7);
    const balance2Date = new Date(today);
    balance2Date.setDate(balance2Date.getDate() + 30);

    setSelectedStudent({
      id: enrollment.student_id,
      name: `${enrollment.profile?.first_name} ${enrollment.profile?.last_name}`,
      courseId: enrollment.course_id,
      courseFee: courseFee,
    });
    setCustomPaymentSchedule({
      balance1Amount: defaultBalance1,
      balance1DueDate: balance1Date.toISOString().split('T')[0],
      balance2Amount: defaultBalance2,
      balance2DueDate: balance2Date.toISOString().split('T')[0],
    });
    setApprovalResult(null);
    setApproveDialogOpen(true);
  };

  const handleConfirmApprove = () => {
    if (selectedStudent) {
      approveStudentMutation.mutate({
        studentId: selectedStudent.id,
        courseId: selectedStudent.courseId,
        paymentSchedule: customPaymentSchedule,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const handleCreateStudent = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.courseId) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createStudentMutation.mutate(formData);
  };


  const filteredEnrollments = pendingEnrollments?.filter((enrollment) => {
    const name = `${enrollment.profile?.first_name || ""} ${enrollment.profile?.last_name || ""}`.toLowerCase();
    const phone = enrollment.profile?.phone?.toLowerCase() || "";
    return (
      searchQuery === "" ||
      name.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: string, enrollmentStatus?: string) => {
    if (enrollmentStatus === "active") {
      return <Badge className="bg-green-500">Enrolled</Badge>;
    }
    if (status === "completed") {
      return <Badge className="bg-blue-500">Paid - Awaiting Approval</Badge>;
    }
    return <Badge variant="secondary">Pending Payment</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Enrollments
            </h1>
            <p className="text-muted-foreground">
              Create student accounts and manage enrollment flow
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enroll New Student</DialogTitle>
                <DialogDescription>
                  Create a student enrollment. Credentials will be generated upon approval.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, courseId: value, batchId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title} - ₹{course.base_fee?.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.courseId && batches && batches.length > 0 && (
                  <div>
                    <Label htmlFor="batch">Preferred Batch (Optional)</Label>
                    <Select
                      value={formData.batchId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, batchId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batch_name} - {batch.available_seats} seats
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="dateOfJoining">Date of Joining</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dateOfJoining"
                      type="date"
                      className="pl-10"
                      value={formData.dateOfJoining}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfJoining: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateStudent}
                  disabled={createStudentMutation.isPending}
                >
                  {createStudentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Enroll Student
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter((e) => e.status === "pending").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter(
                  (e) => e.status === "completed" && e.profile?.enrollment_status !== "active"
                ).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enrolled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter((e) => e.profile?.enrollment_status === "active")
                  .length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No pending enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments?.map((enrollment) => {
                    const canApprove =
                      isSuperAdmin === true && enrollment.profile?.enrollment_status === "enrolled";
                    return (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.profile?.first_name} {enrollment.profile?.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {enrollment.profile?.phone || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{enrollment.courses?.title}</TableCell>
                        <TableCell>
                          {getStatusBadge(enrollment.status, enrollment.profile?.enrollment_status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(enrollment.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {canApprove && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveClick(enrollment)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Approve Dialog */}
        <AlertDialog open={approveDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setApproveDialogOpen(false);
            setSelectedStudent(null);
            setApprovalResult(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {approvalResult ? "Student Approved!" : "Approve Student"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {approvalResult ? (
                  <div className="space-y-4 mt-4">
                    <p className="text-green-600 font-medium">
                      ✓ {selectedStudent?.name} has been activated successfully.
                    </p>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Student ID</Label>
                        <div className="flex items-center gap-2">
                          <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                            {approvalResult.studentCode}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(approvalResult.studentCode)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Generated Password</Label>
                        <div className="flex items-center gap-2">
                          <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                            {approvalResult.password}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(approvalResult.password)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share these credentials with the student securely.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <p>
                      Are you sure you want to approve <strong>{selectedStudent?.name}</strong>? 
                      This will activate their account and generate login credentials.
                    </p>
                    
                    {/* Payment Schedule Customization */}
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Payment Schedule</h4>
                        <span className="text-xs text-muted-foreground">
                          Course Fee: ₹{selectedStudent?.courseFee?.toLocaleString()} (₹2,000 registration already paid)
                        </span>
                      </div>
                      
                      {/* Balance 1 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="balance1Amount" className="text-xs">Balance Payment 1 (₹)</Label>
                          <Input
                            id="balance1Amount"
                            type="number"
                            value={customPaymentSchedule.balance1Amount}
                            onChange={(e) => setCustomPaymentSchedule(prev => ({
                              ...prev,
                              balance1Amount: Number(e.target.value)
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="balance1DueDate" className="text-xs">Due Date</Label>
                          <Input
                            id="balance1DueDate"
                            type="date"
                            value={customPaymentSchedule.balance1DueDate}
                            onChange={(e) => setCustomPaymentSchedule(prev => ({
                              ...prev,
                              balance1DueDate: e.target.value
                            }))}
                          />
                        </div>
                      </div>
                      
                      {/* Balance 2 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="balance2Amount" className="text-xs">Balance Payment 2 (₹)</Label>
                          <Input
                            id="balance2Amount"
                            type="number"
                            value={customPaymentSchedule.balance2Amount}
                            onChange={(e) => setCustomPaymentSchedule(prev => ({
                              ...prev,
                              balance2Amount: Number(e.target.value)
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="balance2DueDate" className="text-xs">Due Date</Label>
                          <Input
                            id="balance2DueDate"
                            type="date"
                            value={customPaymentSchedule.balance2DueDate}
                            onChange={(e) => setCustomPaymentSchedule(prev => ({
                              ...prev,
                              balance2DueDate: e.target.value
                            }))}
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Total: ₹{(2000 + customPaymentSchedule.balance1Amount + customPaymentSchedule.balance2Amount).toLocaleString()} 
                        {selectedStudent?.courseFee && (2000 + customPaymentSchedule.balance1Amount + customPaymentSchedule.balance2Amount) !== selectedStudent.courseFee && (
                          <span className="text-amber-600 ml-2">
                            (differs from course fee by ₹{Math.abs((2000 + customPaymentSchedule.balance1Amount + customPaymentSchedule.balance2Amount) - selectedStudent.courseFee).toLocaleString()})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {approvalResult ? (
                <AlertDialogAction onClick={() => {
                  setApproveDialogOpen(false);
                  setSelectedStudent(null);
                  setApprovalResult(null);
                }}>
                  Done
                </AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel disabled={approveStudentMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmApprove}
                    disabled={approveStudentMutation.isPending}
                  >
                    {approveStudentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Approving...
                      </>
                    ) : (
                      "Confirm Approve"
                    )}
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default AdminEnrollments;
