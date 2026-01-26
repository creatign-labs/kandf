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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, CheckCircle, Clock, Loader2, UserCheck, Mail, Copy, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
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
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingApproval, setEditingApproval] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
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

  const filteredApprovals = pendingApprovals?.filter(approval =>
    approval.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    approval.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    approval.profile?.phone?.includes(searchQuery)
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
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
    // Get course from advance payment
    const courseId = approval.advance_payments?.course_id;
    approveMutation.mutate({
      studentId: approval.student_id,
      courseId: courseId || undefined,
    });
  };

  const pendingCount = pendingApprovals?.filter(a => a.status === "pending").length || 0;
  const approvedCount = pendingApprovals?.filter(a => a.status === "approved").length || 0;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-2xl font-bold text-green-500">{approvedCount}</div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
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

        {/* Table */}
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
                      <Badge variant={approval.status === "approved" ? "default" : "outline"}>
                        {approval.status === "approved" ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Approved
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
                          <Button
                            size="sm"
                            onClick={() => handleApproveStudent(approval)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Approve & Enroll
                          </Button>
                        ) : approval.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStudent(approval)}
                          >
                            View Credentials
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">Super Admin only</span>
                        )}
                        {isSuperAdmin && (
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
                      No pending approvals
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Credentials Dialog */}
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
              <div className="pt-4 border-t">
                <Button className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Send Credentials via Email
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
      </main>
    </div>
  );
};

export default StudentApprovals;
