import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Mail, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";

const TEMPLATE_LABELS: Record<string, string> = {
  enquiry_ack: "Enquiry Acknowledgment",
  enrollment_confirmation: "Enrollment Confirmation",
  payment_success: "Payment Success",
  certificate_release: "Certificate Release",
  slot_reminder_24h: "Slot Reminder (24h)",
  slot_reminder_2h: "Slot Reminder (2h)",
  slot_cancellation_cutoff: "Cancellation Cutoff",
};

const EmailLogs = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (logs || []).filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (templateFilter !== "all" && l.template !== templateFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !l.recipient?.toLowerCase().includes(s) &&
        !l.subject?.toLowerCase().includes(s) &&
        !l.template?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const stats = {
    total: logs?.length || 0,
    sent: logs?.filter((l: any) => l.status === "sent").length || 0,
    failed: logs?.filter((l: any) => l.status === "failed").length || 0,
    pending: logs?.filter((l: any) => l.status === "pending").length || 0,
  };

  const templates = Array.from(new Set((logs || []).map((l: any) => l.template).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Mail className="h-7 w-7 text-primary" /> Email Delivery Log
            </h1>
            <p className="text-muted-foreground">Status, timestamps and error details for every send attempt</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Total</div><div className="text-2xl font-bold">{stats.total}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Sent</div><div className="text-2xl font-bold text-green-600">{stats.sent}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Failed</div><div className="text-2xl font-bold text-red-600">{stats.failed}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Pending</div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div></Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search recipient, subject, template..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All templates</SelectItem>
                {templates.map((t: any) => (
                  <SelectItem key={t} value={t}>{TEMPLATE_LABELS[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No email logs match your filters</TableCell></TableRow>
                ) : filtered.map((l: any) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                    <TableCell className="whitespace-nowrap text-sm">{format(new Date(l.created_at), "dd MMM, HH:mm")}</TableCell>
                    <TableCell className="text-sm">{TEMPLATE_LABELS[l.template] || l.template}</TableCell>
                    <TableCell className="text-sm">{l.recipient}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate">{l.subject}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "sent" ? "default" : l.status === "failed" ? "destructive" : "secondary"}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[260px] truncate">{l.error_message || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Email Details</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Template:</span> <strong>{TEMPLATE_LABELS[selected.template] || selected.template}</strong></div>
                <div><span className="text-muted-foreground">Recipient:</span> {selected.recipient}</div>
                <div><span className="text-muted-foreground">Subject:</span> {selected.subject}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={selected.status === "sent" ? "default" : selected.status === "failed" ? "destructive" : "secondary"}>{selected.status}</Badge></div>
                <div><span className="text-muted-foreground">Created:</span> {format(new Date(selected.created_at), "PPpp")}</div>
                {selected.sent_at && <div><span className="text-muted-foreground">Sent:</span> {format(new Date(selected.sent_at), "PPpp")}</div>}
                {selected.provider_message_id && <div><span className="text-muted-foreground">Provider ID:</span> <code className="text-xs">{selected.provider_message_id}</code></div>}
                {selected.error_message && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <div className="font-semibold text-red-700 mb-1">Error</div>
                    <div className="text-red-700 text-xs whitespace-pre-wrap">{selected.error_message}</div>
                  </div>
                )}
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-1">Metadata</div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">{JSON.stringify(selected.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default EmailLogs;
