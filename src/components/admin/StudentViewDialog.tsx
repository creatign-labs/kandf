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
import { UserCircle, Mail, Phone, Hash, BookOpen, Calendar, MonitorPlay, Loader2, CheckCircle, Clock, XCircle, Trash2, Pencil, Save, X, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentRef, setEditPaymentRef] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const unifiedInstallments = useMemo(() => {
    if (!paymentSchedules) return [];
    return paymentSchedules.map((ps) => ({
      id: ps.id,
      source: "schedule" as const,
      label: ps.payment_stage || "Installment",
      amount: Number(ps.amount),
      due_date: ps.due_date,
      status: ps.status,
      payment_reference: (ps as any).payment_reference || null,
      payment_link_id: null as string | null,
      paid_at: ps.paid_at || null,
    }));
  }, [paymentSchedules]);

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

  type InstallmentItem = typeof unifiedInstallments[0];

  const saveInstallment = async (item: InstallmentItem) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) { toast.error("Invalid amount"); return; }
    if (!editDueDate) { toast.error("Due date is required"); return; }

    try {
      const updateData: any = { amount, due_date: editDueDate, status: editStatus, payment_reference: editPaymentRef || null };
      if (editStatus === "paid" && item.status !== "paid") updateData.paid_at = new Date().toISOString();
      if (editStatus !== "paid") updateData.paid_at = null;
      const { error } = await supabase.from("payment_schedules").update(updateData).eq("id", item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["student-payment-schedules", enrollmentId] });
      toast.success("Installment updated");
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const deleteInstallment = async (item: InstallmentItem) => {
    setDeletingId(item.id);
    try {
      const { error } = await supabase.from("payment_schedules").delete().eq("id", item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["student-payment-schedules", enrollmentId] });
      toast.success("Installment deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (item: InstallmentItem) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditDueDate(item.due_date?.split("T")[0] || "");
    setEditStatus(item.status);
    setEditPaymentRef(item.payment_reference || "");
  };

  if (!enrollment) return null;

  const paidItems = unifiedInstallments.filter(i => i.status === "paid");
  const totalPaid = paidItems.reduce((s, i) => s + i.amount, 0);
  const totalAmount = unifiedInstallments.reduce((s, i) => s + i.amount, 0);

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
              <Badge variant={enrollment.status === "active" ? "default" : enrollment.status === "completed" ? "secondary" : "outline"}>
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

          {/* Unified Payment Plan */}
          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Payment Plan
            </h4>
            {paymentsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : unifiedInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No installments found.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid {paidItems.length} of {unifiedInstallments.length} installments</span>
                  <span className="font-medium">₹{totalPaid.toLocaleString()} / ₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unifiedInstallments.map((item) => (
                    editingId === item.id ? (
                      <div key={item.id} className="border rounded-md px-3 py-2 space-y-2 bg-muted/30">
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
                          <label className="text-xs text-muted-foreground">Payment Reference #</label>
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
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => saveInstallment(item)}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} className="border rounded-md px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getPaymentStatusIcon(item.status)}
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>₹{item.amount.toLocaleString()}</span>
                            <span className="text-xs">{format(new Date(item.due_date), "dd MMM yyyy")}</span>
                          </div>
                        </div>
                        {item.payment_reference && (
                          <div className="text-xs text-muted-foreground font-mono">Ref: {item.payment_reference}</div>
                        )}
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex-1" />
                          {isSuperAdmin && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing(item)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Installment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Delete "{item.label}" (₹{item.amount.toLocaleString()})? This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteInstallment(item)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </>
            )}
          </Card>
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
