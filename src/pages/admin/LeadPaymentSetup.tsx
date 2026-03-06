import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Loader2, Copy, ExternalLink, Plus, Trash2, CheckCircle, Clock, AlertTriangle, CreditCard, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Installment {
  id?: string;
  installment_number: number;
  label: string;
  amount: number;
  due_date: string;
  status: string;
  payment_reference?: string;
  payment_link_id?: string | null;
}

const LeadPaymentSetup = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const BASE_URL = window.location.origin;

  const [enrollmentFee, setEnrollmentFee] = useState(2000);
  const [discountType, setDiscountType] = useState<string>("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingLinkFor, setGeneratingLinkFor] = useState<string | null>(null);
  const [markingPaidFor, setMarkingPaidFor] = useState<string | null>(null);

  // Fetch lead info
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, courses(title, base_fee)")
        .eq("id", leadId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  // Fetch existing payment plan
  const { data: existingPlan, isLoading: planLoading } = useQuery({
    queryKey: ["lead-payment-plan", leadId],
    queryFn: async () => {
      const { data: plan } = await supabase
        .from("lead_payment_plans")
        .select("*")
        .eq("lead_id", leadId!)
        .maybeSingle();

      if (!plan) return null;

      const { data: installmentData } = await supabase
        .from("lead_installments")
        .select("*")
        .eq("plan_id", plan.id)
        .order("installment_number");

      return { plan, installments: installmentData || [] };
    },
    enabled: !!leadId,
  });

  const calculateDiscount = () => {
    if (discountType === "none" || !discountValue) return 0;
    const courseFee = lead?.courses?.base_fee || enrollmentFee;
    if (discountType === "fixed") return discountValue;
    if (discountType === "percentage") return Math.round((courseFee * discountValue) / 100);
    return 0;
  };

  const netAmount = (lead?.courses?.base_fee || enrollmentFee) - calculateDiscount();

  // Load existing plan data
  useEffect(() => {
    if (existingPlan?.plan) {
      setEnrollmentFee(existingPlan.plan.enrollment_fee);
      setDiscountType(existingPlan.plan.discount_type || "none");
      setDiscountValue(existingPlan.plan.discount_value || 0);
      setInstallments(
        existingPlan.installments.map((inst: any) => ({
          id: inst.id,
          installment_number: inst.installment_number,
          label: inst.label,
          amount: inst.amount,
          due_date: inst.due_date,
          status: inst.status,
          payment_reference: inst.payment_reference || "",
        }))
      );
    } else if (lead?.courses?.base_fee && !existingPlan) {
      const courseFee = lead.courses.base_fee;
      generateDefaultInstallments(courseFee);
    }
  }, [existingPlan, lead]);

  // Auto-adjust installment amounts when net payable changes
  // Keep enrollment fee (installment_number 1) fixed at enrollmentFee, adjust only other installments
  useEffect(() => {
    if (installments.length === 0) return;
    const paidTotal = installments.filter(i => i.status === "paid").reduce((s, i) => s + (Number(i.amount) || 0), 0);
    
    // Separate enrollment fee from other unpaid installments
    const enrollmentInst = installments.find(i => i.installment_number === 1 && i.status !== "paid");
    const otherUnpaid = installments.filter(i => i.status !== "paid" && i.installment_number !== 1);
    
    if (otherUnpaid.length === 0 && !enrollmentInst) return;

    // Fix enrollment fee amount
    const fixedEnrollment = enrollmentInst ? enrollmentFee : 0;
    const enrollmentPaid = installments.find(i => i.installment_number === 1 && i.status === "paid");
    const enrollmentTotal = enrollmentPaid ? Number(enrollmentPaid.amount) || 0 : fixedEnrollment;
    
    const remainingForOthers = Math.max(0, netAmount - paidTotal - (enrollmentInst ? fixedEnrollment : 0));
    const oldOtherTotal = otherUnpaid.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    // Skip if already matching
    if (Math.abs(remainingForOthers - oldOtherTotal) < 1 && (!enrollmentInst || enrollmentInst.amount === fixedEnrollment)) return;

    const updated = installments.map(inst => {
      if (inst.status === "paid") return inst;
      // Keep enrollment fee fixed
      if (inst.installment_number === 1) return { ...inst, amount: fixedEnrollment };
      // Distribute remaining among other unpaid installments
      if (otherUnpaid.length === 0) return inst;
      const share = oldOtherTotal > 0
        ? Math.round((Number(inst.amount) / oldOtherTotal) * remainingForOthers)
        : Math.round(remainingForOthers / otherUnpaid.length);
      return { ...inst, amount: share };
    });

    // Fix rounding: adjust last non-enrollment unpaid installment
    const newOtherTotal = updated.filter(i => i.status !== "paid" && i.installment_number !== 1).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const diff = remainingForOthers - newOtherTotal;
    if (diff !== 0) {
      const lastOtherIdx = updated.map((inst, i) => inst.status !== "paid" && inst.installment_number !== 1 ? i : -1).filter(i => i !== -1).pop();
      if (lastOtherIdx !== undefined) {
        updated[lastOtherIdx] = { ...updated[lastOtherIdx], amount: updated[lastOtherIdx].amount + diff };
      }
    }

    setInstallments(updated);
  }, [netAmount, enrollmentFee]);

  const generateDefaultInstallments = (total: number) => {
    const registration = Math.min(2000, total);
    const balance = total - registration;
    const balance1 = Math.round(balance / 2);
    const balance2 = balance - balance1;

    const defaultInst: Installment[] = [
      { installment_number: 1, label: "Enrollment Fee", amount: registration, due_date: format(new Date(), "yyyy-MM-dd"), status: "pending" },
    ];
    if (balance1 > 0) {
      defaultInst.push({ installment_number: 2, label: "Balance 1", amount: balance1, due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"), status: "pending" });
    }
    if (balance2 > 0) {
      defaultInst.push({ installment_number: 3, label: "Balance 2", amount: balance2, due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"), status: "pending" });
    }
    setInstallments(defaultInst);
  };

  const addInstallment = () => {
    const nextNum = installments.length + 1;
    setInstallments([
      ...installments,
      {
        installment_number: nextNum,
        label: `Installment ${nextNum}`,
        amount: 0,
        due_date: format(addDays(new Date(), 14 * nextNum), "yyyy-MM-dd"),
        status: "pending",
      },
    ]);
  };

  const removeInstallment = (index: number) => {
    if (installments[index]?.status === "paid") {
      toast({ title: "Cannot remove", description: "This installment is already paid.", variant: "destructive" });
      return;
    }
    const updated = installments.filter((_, i) => i !== index).map((inst, i) => ({ ...inst, installment_number: i + 1 }));
    setInstallments(updated);
  };

  const updateInstallment = (index: number, field: keyof Installment, value: any) => {
    const updated = [...installments];
    (updated[index] as any)[field] = value;
    setInstallments(updated);
  };

  const totalInstallmentAmount = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  const amountDifference = netAmount - totalInstallmentAmount;

  const savePlan = async () => {
    if (!leadId) return;
    if (Math.abs(amountDifference) > 1) {
      toast({ title: "Amount mismatch", description: `Installments total (₹${totalInstallmentAmount.toLocaleString()}) must equal net amount (₹${netAmount.toLocaleString()}).`, variant: "destructive" });
      return;
    }
    if (installments.some(inst => !inst.amount || inst.amount <= 0)) {
      toast({ title: "Invalid amounts", description: "All installments must have a positive amount.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert the plan
      const planPayload = {
        lead_id: leadId,
        course_id: lead?.course_id || null,
        enrollment_fee: enrollmentFee,
        discount_type: discountType === "none" ? null : discountType,
        discount_value: discountType === "none" ? 0 : discountValue,
        net_amount: netAmount,
        total_installments: installments.length,
        created_by: user.id,
      };

      let planId: string;
      if (existingPlan?.plan?.id) {
        const { error } = await supabase
          .from("lead_payment_plans")
          .update(planPayload)
          .eq("id", existingPlan.plan.id);
        if (error) throw error;
        planId = existingPlan.plan.id;

        // Delete removed installments (only unpaid)
        const existingIds = installments.filter(i => i.id).map(i => i.id!);
        if (existingIds.length > 0) {
          await supabase
            .from("lead_installments")
            .delete()
            .eq("plan_id", planId)
            .not("id", "in", `(${existingIds.join(",")})`)
            .neq("status", "paid");
        }
      } else {
        const { data: newPlan, error } = await supabase
          .from("lead_payment_plans")
          .insert(planPayload)
          .select()
          .single();
        if (error) throw error;
        planId = newPlan.id;
      }

      // Upsert installments
      for (const inst of installments) {
        const instPayload = {
          plan_id: planId,
          lead_id: leadId,
          installment_number: inst.installment_number,
          label: inst.label,
          amount: Number(inst.amount),
          due_date: inst.due_date,
          status: inst.status,
          payment_reference: inst.payment_reference || null,
        };

        if (inst.id) {
          await supabase.from("lead_installments").update(instPayload).eq("id", inst.id);
        } else {
          await supabase.from("lead_installments").insert(instPayload);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["lead-payment-plan", leadId] });
      toast({ title: "Payment plan saved!" });
    } catch (err: any) {
      toast({ title: "Error saving plan", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const markAsPaid = async (installmentId: string, installmentNumber: number) => {
    if (!window.confirm("Mark this installment as paid? This action cannot be undone.")) return;
    setMarkingPaidFor(installmentId);
    try {
      const { error } = await supabase
        .from("lead_installments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", installmentId);
      if (error) throw error;

      // When enrollment fee (installment #1) is paid, convert lead AND create student account
      if (installmentNumber === 1 && leadId) {
        const { data: convResult, error: convError } = await supabase.functions.invoke(
          "convert-lead-to-student",
          { body: { leadId } }
        );
        if (convError) {
          console.error("Lead conversion error:", convError);
          toast({ title: "Warning", description: "Payment marked but student creation failed. Contact support.", variant: "destructive" });
        } else if (convResult?.error) {
          console.error("Lead conversion error:", convResult.error);
          toast({ title: "Warning", description: convResult.error, variant: "destructive" });
        }
      }

      // Update local state
      setInstallments(prev =>
        prev.map(inst =>
          inst.id === installmentId ? { ...inst, status: "paid" } : inst
        )
      );

      queryClient.invalidateQueries({ queryKey: ["lead-payment-plan", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Marked as paid!",
        description: installmentNumber === 1 ? "Enrollment fee paid. Lead converted & student account created." : "Installment marked as paid.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setMarkingPaidFor(null);
    }
  };

  const generatePaymentLink = async (installmentId: string) => {
    setGeneratingLinkFor(installmentId);
    try {
      const inst = installments.find(i => i.id === installmentId);
      const { data, error } = await supabase.functions.invoke('create-lead-payment-link', {
        body: { installmentId, amount: inst ? Number(inst.amount) : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const shortUrl = data.payment_link?.short_url;
      if (shortUrl) {
        await navigator.clipboard.writeText(shortUrl);
        toast({ title: "Payment link generated & copied!", description: shortUrl });
      } else {
        toast({ title: "Payment link generated!", description: "Link created successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ["lead-payment-plan", leadId] });
    } catch (err: any) {
      toast({ title: "Failed to generate link", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLinkFor(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    if (status === "overdue") return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (leadLoading || planLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Lead not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/admin/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Leads
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Payment Setup</h1>
          <p className="text-muted-foreground">Configure payment plan for {lead.name}</p>
        </div>

        {/* Lead Info Card */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{lead.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{lead.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{lead.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Course</p>
              <p className="font-medium">{lead.courses?.title || "Not specified"}</p>
            </div>
          </div>
        </Card>

        {/* Fee & Discount Configuration */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Fee Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Course Fee (₹)</Label>
              <Input
                type="number"
                value={lead.courses?.base_fee || enrollmentFee}
                disabled
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">From course settings</p>
            </div>
            <div>
              <Label>Visiting Discount Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discountType !== "none" && (
              <div>
                <Label>{discountType === "fixed" ? "Discount Amount (₹)" : "Discount (%)"}</Label>
                <Input
                  type="number"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="mt-1"
                  min={0}
                  max={discountType === "percentage" ? 100 : undefined}
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-muted rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Course Fee: ₹{(lead.courses?.base_fee || enrollmentFee).toLocaleString()}</p>
              {calculateDiscount() > 0 && (
                <p className="text-sm text-green-600">Discount: -₹{calculateDiscount().toLocaleString()}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Net Payable</p>
              <p className="text-2xl font-bold">₹{netAmount.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Installment Schedule */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Payment Schedule</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => generateDefaultInstallments(netAmount)}>
                Reset to Default
              </Button>
              <Button size="sm" onClick={addInstallment}>
                <Plus className="h-4 w-4 mr-1" />Add Installment
              </Button>
            </div>
          </div>

          {amountDifference !== 0 && installments.length > 0 && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${Math.abs(amountDifference) > 1 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"}`}>
              {Math.abs(amountDifference) > 1
                ? `⚠ Installment total (₹${totalInstallmentAmount.toLocaleString()}) differs from net amount (₹${netAmount.toLocaleString()}) by ₹${Math.abs(amountDifference).toLocaleString()}`
                : "✓ Installments match the net amount"}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Ref.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.map((inst, index) => (
                <TableRow key={inst.id || index}>
                  <TableCell className="font-medium">{inst.installment_number}</TableCell>
                  <TableCell>
                    <Input
                      value={inst.label}
                      onChange={(e) => updateInstallment(index, "label", e.target.value)}
                      className="h-8"
                      disabled={inst.status === "paid"}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={inst.amount || ""}
                      onChange={(e) => updateInstallment(index, "amount", Number(e.target.value))}
                      className="h-8 w-28"
                      disabled={inst.status === "paid"}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => updateInstallment(index, "due_date", e.target.value)}
                      className="h-8"
                      disabled={inst.status === "paid"}
                    />
                  </TableCell>
                  <TableCell>{getStatusBadge(inst.status)}</TableCell>
                  <TableCell>
                    <Input
                      value={inst.payment_reference || ""}
                      onChange={(e) => updateInstallment(index, "payment_reference", e.target.value)}
                      className="h-8 w-32"
                      placeholder="Ref #"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inst.id && inst.status !== "paid" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-green-600 border-green-300 hover:bg-green-50"
                                disabled={markingPaidFor === inst.id}
                                onClick={() => markAsPaid(inst.id!, inst.installment_number)}
                              >
                                {markingPaidFor === inst.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Paid</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={generatingLinkFor === inst.id}
                                onClick={() => generatePaymentLink(inst.id!)}
                              >
                                {generatingLinkFor === inst.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <IndianRupee className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate Razorpay Payment Link</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {!inst.id && inst.status !== "paid" && (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                      {inst.status !== "paid" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeInstallment(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {installments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No installments configured. Click "Add Installment" to begin.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!existingPlan && installments.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Save Payment Plan to Generate Payment Links
            </p>
          )}
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/leads")}>Cancel</Button>
          <Button onClick={savePlan} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingPlan ? "Update Payment Plan" : "Save Payment Plan"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LeadPaymentSetup;
