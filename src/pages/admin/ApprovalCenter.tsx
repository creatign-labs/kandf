import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ApprovalCenter = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for requesters
      const userIds = [...new Set((data || []).map(r => r.requested_by))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(r => ({
        ...r,
        requester: profileMap.get(r.requested_by)
      }));
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('approval_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `approval_${status}`,
        entity_type: 'approval_request',
        entity_id: id,
        new_value: { status, note: reviewNote }
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast({ title: `Request ${status}` });
      setSelectedRequest(null);
      setReviewNote("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="super_admin" userName="Super Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const pending = requests?.filter(r => r.status === 'pending') || [];
  const resolved = requests?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="min-h-screen bg-background">
      <Header role="super_admin" userName="Super Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Approval Center</h1>
          <p className="text-muted-foreground">Review and act on admin requests</p>
        </div>

        {pending.length > 0 && (
          <Card className="p-4 mb-6 border-yellow-500/50 bg-yellow-500/5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">{pending.length} pending request{pending.length !== 1 ? 's' : ''}</span>
            </div>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map(req => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Badge variant="outline">{req.request_type.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    {req.requester ? `${req.requester.first_name} ${req.requester.last_name}` : 'Unknown'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {JSON.stringify(req.details)}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(req.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'pending' && (
                      <Button size="sm" onClick={() => setSelectedRequest(req)}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!requests || requests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No approval requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{selectedRequest.request_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Details</p>
                <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto">
                  {JSON.stringify(selectedRequest.details, null, 2)}
                </pre>
              </div>
              <Textarea
                placeholder="Add a review note (optional)..."
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedRequest && reviewMutation.mutate({ id: selectedRequest.id, status: 'rejected' })}
              disabled={reviewMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={() => selectedRequest && reviewMutation.mutate({ id: selectedRequest.id, status: 'approved' })}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalCenter;
