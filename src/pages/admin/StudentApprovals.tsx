import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle, Clock, Loader2, UserCheck, Mail, Eye, EyeOff, Trash2, Pencil, XCircle, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const StudentApprovals = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectingStudent, setRejectingStudent] = useState<any>(null);
  const [editingApproval, setEditingApproval] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const queryClient = useQueryClient();

  // Check if current user is super_admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
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

  // Fetch pending approvals with advance payments
  const { data: pendingApprovals, isLoading } = useQuery({
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

      // Get profile info for each student
      const studentIds = approvals?.map(a => a.student_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", studentIds);

      return approvals?.map(approval => ({
        ...approval,
        profile: profiles?.find(p => p.id === approval.student_id),
      }));
    },
  });

  // Fetch all courses for dropdown
  const approveMutation = useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId?: string }) => {
      try {
        const { data, error } = await supabase.functions.invoke('approve-student-with-password', {
          body: { 
            student_id: studentId,
            course_id: courseId || undefined,
          }
        });

        if (error) {
          console.error("Edge function invocation error:", error);
          throw new Error(error.message || "Failed to call approval function");
        }

        if (!data) {
          throw new Error("No response from approval function");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to approve student");
        }

        return { studentId, password: data.password, studentCode: data.studentCode };
      } catch (err) {
        console.error("Approval mutation error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
        toast({
          title: "Student Approved",
          description: "Account is now active. Password has been updated.",
        });
        // Show the credentials dialog
        const student = pendingApprovals?.find(a => a.student_id === data.studentId);
        if (student) {
          setSelectedStudent({ ...student, generated_password: data.password, student_code: data.studentCode });
        }
      } catch (err) {
        console.error("Error in onSuccess handler:", err);
      }
    },
    onError: (error: Error) => {
      console.error("Approval error:", error);
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
      toast({
        title: "Record Deleted",
        description: "The approval record has been removed.",
      });
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
      toast({
        title: "Record Updated",
        description: "The approval status has been updated.",
      });
      setEditingApproval(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredApprovals = pendingApprovals?.filter(approval => {
    const matchesSearch = 
      approval.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.profile?.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || approval.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


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
    // Get course from advance payment
    const courseId = approval.advance_payments?.course_id;
    approveMutation.mutate({
      studentId: approval.student_id,
      courseId: courseId || undefined,
    });
  };

  // Reject student mutation
  const rejectMutation = useMutation({
    mutationFn: async (studentId: string) => {
      // Update student_access_approvals status to rejected
      const { error: approvalError } = await supabase
        .from("student_access_approvals")
        .update({ 
          status: "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("student_id", studentId);

      if (approvalError) throw approvalError;

      // Update profile enrollment_status to cancelled
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          enrollment_status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", studentId);

      if (profileError) throw profileError;

      // Create notification for the student
      await supabase.from("notifications").insert({
        user_id: studentId,
        title: "Application Rejected",
        message: "Your application has been rejected. Please contact Admin for more details.",
        type: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      toast({
        title: "Application Rejected",
        description: "The student has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingCount = pendingApprovals?.filter(a => a.status === "pending").length || 0;
  const approvedCount = pendingApprovals?.filter(a => a.status === "approved").length || 0;
  const rejectedCount = pendingApprovals?.filter(a => a.status === "rejected").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Student Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve student enrollments
            {!isSuperAdmin && (
              <Badge variant="outline" className="ml-2">View Only</Badge>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mb-6">
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

        {/* Tabs and Search */}
        <Card className="p-4 mb-6">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mb-4">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>
        <Card className="p-6">
          {isLoading ? (
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

        {/* Credentials Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => { setSelectedStudent(null); setShowPassword(false); }}>
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
                  <Input value={selectedStudent.student_code} readOnly className="font-mono font-bold" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={selectedStudent?.profile?.email || "N/A"} readOnly />
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
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <Button 
                  className="w-full gap-2"
                  disabled={sendingEmail}
                  onClick={async () => {
                    if (!selectedStudent?.profile?.email) {
                      toast({ title: "No email found", description: "Student has no email address on file.", variant: "destructive" });
                      return;
                    }
                    setSendingEmail(true);
                    try {
                      const { studentCredentialsEmail } = await import("@/lib/emailTemplates");
                      const html = studentCredentialsEmail({
                        studentName: `${selectedStudent.profile.first_name} ${selectedStudent.profile.last_name}`,
                        studentId: selectedStudent.student_code || "N/A",
                        email: selectedStudent.profile.email,
                        password: selectedStudent.generated_password || "N/A",
                        courseName: selectedStudent.advance_payments?.courses?.title,
                        loginUrl: `${window.location.origin}/login`,
                      });
                      const { data, error } = await supabase.functions.invoke("send-email", {
                        body: {
                          to: selectedStudent.profile.email,
                          subject: "Your Knead & Frost Student Credentials",
                          html,
                        },
                      });
                      if (error) {
                        console.error('Send email error:', error);
                        throw new Error(data?.error || error.message || 'Failed to send email');
                      }
                      if (!data?.success) {
                        console.error('Send email response:', data);
                        throw new Error(data?.error || 'Failed to send email');
                      }
                      toast({ title: "Email Sent", description: `Credentials sent to ${selectedStudent.profile.email}` });
                    } catch (err: any) {
                      console.error('Share via email catch:', err);
                      toast({ title: "Email Failed", description: err.message || "Could not send email", variant: "destructive" });
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {sendingEmail ? "Sending..." : "Share via Email"}
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
      </main>
    </div>
  );
};

export default StudentApprovals;
