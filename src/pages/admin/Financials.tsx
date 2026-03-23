import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import { StatsCard } from "@/components/StatsCard";
import { IndianRupee, TrendingUp, AlertTriangle, RefreshCw, Loader2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Financials = () => {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<string>("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");

  // Revenue summary
  const { data: revenue } = useQuery({
    queryKey: ["financials-revenue", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("payments").select("total_amount, status, payment_date");
      if (dateFrom) query = query.gte("payment_date", dateFrom);
      if (dateTo) query = query.lte("payment_date", dateTo + "T23:59:59");
      const { data } = await query;

      const collected = data?.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.total_amount), 0) || 0;
      const pending = data?.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.total_amount), 0) || 0;
      return { collected, pending, total: collected + pending };
    },
  });

  // Overdue schedules
  const { data: overdueSchedules } = useQuery({
    queryKey: ["financials-overdue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_schedules")
        .select("*, profiles:student_id(first_name, last_name)")
        .eq("status", "overdue")
        .order("due_date", { ascending: true });
      return data || [];
    },
  });

  // Financial ledger entries
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ["financial-ledger"],
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_ledger")
        .select("*, profiles:student_id(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Students for the manual entry form
  const { data: students } = useQuery({
    queryKey: ["financials-students"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name, email").limit(200);
      return data || [];
    },
  });

  // Create ledger entry
  const createEntryMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("financial_ledger").insert({
        student_id: selectedStudentId,
        enrollment_id: selectedEnrollmentId || null,
        entry_type: entryType,
        amount: parseFloat(entryAmount),
        notes: entryNotes,
        performed_by: user.id,
      });
      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: `financial_${entryType}`,
        entity_type: "financial_ledger",
        entity_id: selectedStudentId,
        new_value: { entry_type: entryType, amount: parseFloat(entryAmount), notes: entryNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
      toast({ title: "Ledger entry created" });
      setDialogOpen(false);
      setEntryType("");
      setEntryAmount("");
      setEntryNotes("");
      setSelectedStudentId("");
      setSelectedEnrollmentId("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const overdueTotal = overdueSchedules?.reduce((s, o) => s + Number(o.amount), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role="super_admin" userName="Super Admin" />

      <div className="container px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Financial Management</h1>
            <p className="text-muted-foreground">Revenue tracking, adjustments & refunds</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Financial Ledger Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger><SelectValue placeholder="Entry type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="write_off">Write Off</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount (₹)" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} />
                <Textarea placeholder="Notes" value={entryNotes} onChange={e => setEntryNotes(e.target.value)} />
                <Button
                  className="w-full"
                  disabled={!entryType || !selectedStudentId || !entryAmount || createEntryMutation.isPending}
                  onClick={() => createEntryMutation.mutate()}
                >
                  {createEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
          <StatsCard title="Revenue Collected" value={`₹${((revenue?.collected || 0) / 1000).toFixed(1)}k`} icon={IndianRupee} variant="success" />
          <StatsCard title="Pending" value={`₹${((revenue?.pending || 0) / 1000).toFixed(1)}k`} icon={TrendingUp} variant="default" />
          <StatsCard title="Overdue" value={`₹${(overdueTotal / 1000).toFixed(1)}k`} icon={AlertTriangle} variant="warning" />
          <StatsCard title="Overdue Count" value={String(overdueSchedules?.length || 0)} icon={RefreshCw} variant="warning" />
        </div>

        {/* Date Filters */}
        <div className="flex gap-3 mb-6">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>

        {/* Overdue Installments */}
        {overdueSchedules && overdueSchedules.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Overdue Installments</CardTitle>
              <ExportButton data={overdueSchedules as unknown as Record<string, unknown>[]} filename="overdue_installments" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueSchedules.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.profiles?.first_name} {s.profiles?.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{s.payment_stage}</Badge></TableCell>
                      <TableCell>₹{Number(s.amount).toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(s.due_date), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Financial Ledger */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Financial Ledger</CardTitle>
            <ExportButton data={ledgerEntries as unknown as Record<string, unknown>[]} filename="financial_ledger" />
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : ledgerEntries && ledgerEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>{entry.profiles?.first_name} {entry.profiles?.last_name}</TableCell>
                      <TableCell>
                        <Badge variant={entry.entry_type === "refund" ? "destructive" : entry.entry_type === "payment" ? "default" : "secondary"}>
                          {entry.entry_type}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{Number(entry.amount).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No ledger entries yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Financials;
