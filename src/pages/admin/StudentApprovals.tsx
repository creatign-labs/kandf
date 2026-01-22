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
import { Search, CheckCircle, Clock, Loader2, UserCheck, Mail, Copy, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const StudentApprovals = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
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

  // Approve student mutation - uses backend function for proper enforcement
  const approveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate password
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "!";

      // Call backend function to approve student (enforces super_admin check)
      const { error: approveError } = await supabase.rpc('approve_student_access', {
        p_student_id: studentId
      });

      if (approveError) {
        throw new Error(approveError.message);
      }

      // Update the student_access_approvals with generated password
      const { error: passwordError } = await supabase
        .from("student_access_approvals")
        .update({
          generated_password: password,
          credentials_sent_at: new Date().toISOString(),
        })
        .eq("student_id", studentId);

      if (passwordError) {
        console.error("Failed to save password:", passwordError);
      }

      return { studentId, password };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-approvals"] });
      toast({
        title: "Student Approved",
        description: "Account is now active. Credentials have been generated.",
      });
      // Show the credentials dialog
      const student = pendingApprovals?.find(a => a.student_id === data.studentId);
      if (student) {
        setSelectedStudent({ ...student, generated_password: data.password });
      }
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
                      {approval.status === "pending" && isSuperAdmin ? (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(approval.student_id)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Approve & Generate Credentials"
                          )}
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
      </main>
    </div>
  );
};

export default StudentApprovals;
