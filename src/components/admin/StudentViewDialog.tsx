import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { UserCircle, Mail, Phone, Hash, BookOpen, Calendar, MonitorPlay, CreditCard, Loader2, CheckCircle, Clock, XCircle, Trash2, Pencil, Save, X, FileText, Link, ExternalLink, Copy, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudentViewDialogProps {
  enrollment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManageOnlineClass?: () => void;
  isSuperAdmin?: boolean;
}

export const StudentViewDialog = ({ enrollment, open, onOpenChange, onManageOnlineClass, isSuperAdmin }: StudentViewDialogProps) => {
  const profile = enrollment?.profile;
  const studentId = enrollment?.student_id;
  const enrollmentId = enrollment?.id;
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentRef, setEditPaymentRef] = useState("");
  // Fetch payment schedules
  const { data: paymentSchedules, isLoading: paymentsLoading } = useQuery({
    queryKey: ["student-payment-schedules", enrollmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_schedules")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .order("due_date");
      return data || [];
    },
    enabled: !!enrollmentId && open,
  });

  // Fetch online access status
  const { data: onlineAccess } = useQuery({
    queryKey: ["student-online-access-view", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_online_access")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();
      return data;
    },
    enabled: !!studentId && open,
  });

  // Fetch batch info
  const { data: batch } = useQuery({
    queryKey: ["student-batch-view", enrollment?.batch_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("batch_name, time_slot, days, start_date")
        .eq("id", enrollment.batch_id)
        .maybeSingle();
      return data;
    },
    enabled: !!enrollment?.batch_id && open,
  });

  const deleteEnrollment = useMutation({
    mutationFn: async () => {
      await supabase.from("payment_schedules").delete().eq("enrollment_id", enrollmentId);
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrollment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete enrollment");
    },
  });

  const updatePaymentSchedule = useMutation({
    mutationFn: async ({ id, amount, due_date, status, payment_reference }: { id: string; amount: number; due_date: string; status: string; payment_reference?: string }) => {
      const updateData: any = { amount, due_date, status, payment_reference: payment_reference || null };
      if (status === "paid" && !paymentSchedules?.find(p => p.id === id && p.status === "paid")) {
        updateData.paid_at = new Date().toISOString();
      }
      if (status !== "paid") {
        updateData.paid_at = null;
      }
      const { error } = await supabase.from("payment_schedules").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment schedule updated");
      queryClient.invalidateQueries({ queryKey: ["student-payment-schedules", enrollmentId] });
      setEditingPaymentId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update payment");
    },
  });

  const startEditing = (ps: any) => {
    setEditingPaymentId(ps.id);
    setEditAmount(String(ps.amount));
    setEditDueDate(ps.due_date?.split("T")[0] || "");
    setEditStatus(ps.status);
    setEditPaymentRef((ps as any).payment_reference || "");
  };

  const saveEditing = () => {
    if (!editingPaymentId) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!editDueDate) {
      toast.error("Due date is required");
      return;
    }
    updatePaymentSchedule.mutate({ id: editingPaymentId, amount, due_date: editDueDate, status: editStatus, payment_reference: editPaymentRef });
  };

  if (!enrollment) return null;

  const paidCount = paymentSchedules?.filter(p => p.status === "paid").length || 0;
  const totalSchedules = paymentSchedules?.length || 0;
  const totalPaid = paymentSchedules?.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) || 0;
  const totalDue = paymentSchedules?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "on_hold": return "bg-yellow-500";
      default: return "bg-muted";
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "overdue": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Student Details
          </DialogTitle>
          <DialogDescription>
            Full profile and enrollment overview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Student Info */}
          <Card className="p-4 space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Profile</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>{enrollment.student_code || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{profile?.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || "N/A"}</span>
              </div>
            </div>
          </Card>

          {/* Course & Enrollment */}
          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Enrollment</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{enrollment.courses?.title || "N/A"}</span>
              </div>
              <Badge className={getStatusColor(enrollment.status)}>
                {enrollment.status === "on_hold" ? "On Hold" : enrollment.status?.charAt(0).toUpperCase() + enrollment.status?.slice(1)}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{enrollment.progress || 0}%</span>
              </div>
              <Progress value={enrollment.progress || 0} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Enrolled: {format(new Date(enrollment.enrollment_date), "dd MMM yyyy")}
              </div>
              {batch && (
                <div>Batch: {batch.batch_name}</div>
              )}
            </div>
            {batch && (
              <div className="text-xs text-muted-foreground">
                {batch.days} · {batch.time_slot}{batch.start_date ? ` · Starts ${format(new Date(batch.start_date), "dd MMM yyyy")}` : ""}
              </div>
            )}
          </Card>

          {/* Payment Summary */}
          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Payment Schedule</h4>
            {paymentsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : totalSchedules === 0 ? (
              <p className="text-sm text-muted-foreground">No payment schedule found.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid {paidCount} of {totalSchedules} installments</span>
                  <span className="font-medium">₹{totalPaid.toLocaleString()} / ₹{totalDue.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {paymentSchedules?.map((ps) => (
                    editingPaymentId === ps.id ? (
                      <div key={ps.id} className="border rounded-md px-3 py-2 space-y-2 bg-muted/30">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Amount (₹)</label>
                            <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Due Date</label>
                            <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Reference #</label>
                          <Input placeholder="Payment reference" value={editPaymentRef} onChange={e => setEditPaymentRef(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="h-8 text-sm flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={saveEditing} disabled={updatePaymentSchedule.isPending}>
                            {updatePaymentSchedule.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingPaymentId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={ps.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {getPaymentStatusIcon(ps.status)}
                          <span>{ps.payment_stage}</span>
                          {(ps as any).payment_reference && (
                            <span className="text-xs text-muted-foreground font-mono">Ref: {(ps as any).payment_reference}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>₹{Number(ps.amount).toLocaleString()}</span>
                          <span className="text-xs">{format(new Date(ps.due_date), "dd MMM")}</span>
                          {isSuperAdmin && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditing(ps)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Online Class Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Online Classes</h4>
              </div>
              <Badge variant={onlineAccess?.is_enabled ? "default" : "secondary"}>
                {onlineAccess?.is_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {onManageOnlineClass && (
              <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-xs" onClick={() => { onOpenChange(false); onManageOnlineClass(); }}>
                Manage Online Class →
              </Button>
            )}
          </Card>
          {/* Delete Enrollment - Super Admin Only */}
          {isSuperAdmin && (
            <Card className="p-4 border-destructive/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-destructive uppercase tracking-wide">Danger Zone</h4>
                  <p className="text-xs text-muted-foreground mt-1">Permanently delete this enrollment record</p>
                </div>
                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Enrollment</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the enrollment for <strong>{profile?.first_name} {profile?.last_name}</strong> ({enrollment.student_code || "N/A"}). Associated payment schedules will also be removed. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteEnrollment.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteEnrollment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Delete Enrollment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
