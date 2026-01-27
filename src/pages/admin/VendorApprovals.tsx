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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle, Clock, Loader2, Building2, Mail, Copy, Eye, EyeOff, Trash2, Pencil, XCircle, Ban } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const VendorApprovals = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [rejectingVendor, setRejectingVendor] = useState<any>(null);
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

  // Fetch vendor approvals
  const { data: vendorApprovals, isLoading } = useQuery({
    queryKey: ["vendor-approvals"],
    queryFn: async () => {
      const { data: approvals, error } = await supabase
        .from("vendor_access_approvals")
        .select(`
          *,
          vendor_profiles(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profile info for each vendor user
      const userIds = approvals?.map(a => a.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      return approvals?.map(approval => ({
        ...approval,
        profile: profiles?.find(p => p.id === approval.user_id),
      }));
    },
  });

  // Approve vendor mutation
  const approveMutation = useMutation({
    mutationFn: async (vendorApproval: any) => {
      const { data, error } = await supabase.functions.invoke('approve-vendor-with-password', {
        body: {
          vendor_user_id: vendorApproval.user_id,
          vendor_profile_id: vendorApproval.vendor_profile_id,
        }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to approve vendor");

      return { vendorApproval, password: data.password, vendorCode: data.vendor_code };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-approvals"] });
      toast({
        title: "Vendor Approved",
        description: "Account is now active. Credentials have been generated.",
      });
      setSelectedVendor({ ...data.vendorApproval, generated_password: data.password, vendor_code: data.vendorCode });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete approval record mutation
  const deleteMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const { error } = await supabase
        .from("vendor_access_approvals")
        .delete()
        .eq("id", approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-approvals"] });
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
        .from("vendor_access_approvals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-approvals"] });
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

  const filteredApprovals = vendorApprovals?.filter(approval => {
    const matchesSearch = 
      approval.vendor_profiles?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || approval.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  // Reject vendor mutation
  const rejectMutation = useMutation({
    mutationFn: async (vendorUserId: string) => {
      // Update vendor_access_approvals status to rejected
      const { error: approvalError } = await supabase
        .from("vendor_access_approvals")
        .update({ 
          status: "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", vendorUserId);

      if (approvalError) throw approvalError;

      // Update vendor_profiles approval_status
      const { error: profileError } = await supabase
        .from("vendor_profiles")
        .update({ 
          approval_status: "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", vendorUserId);

      if (profileError) throw profileError;

      // Create notification for the vendor
      await supabase.from("notifications").insert({
        user_id: vendorUserId,
        title: "Application Rejected",
        message: "Your application has been rejected. Please contact Admin for more details.",
        type: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-approvals"] });
      toast({
        title: "Application Rejected",
        description: "The vendor has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingCount = vendorApprovals?.filter(a => a.status === "pending").length || 0;
  const approvedCount = vendorApprovals?.filter(a => a.status === "approved").length || 0;
  const rejectedCount = vendorApprovals?.filter(a => a.status === "rejected").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Vendor Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve vendor registrations
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
              placeholder="Search by company name or email..."
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
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals?.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {approval.vendor_profiles?.company_name || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {approval.profile?.first_name} {approval.profile?.last_name}
                    </TableCell>
                    <TableCell>
                      {approval.vendor_profiles?.contact_email || approval.profile?.email}
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
                            <CheckCircle className="h-3 w-3 mr-1" />
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
                              onClick={() => approveMutation.mutate(approval)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Approve & Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectingVendor(approval)}
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
                            onClick={() => setSelectedVendor(approval)}
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
                      No vendor approvals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Credentials Dialog */}
        <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vendor Credentials</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <p className="text-lg">{selectedVendor?.vendor_profiles?.company_name}</p>
              </div>
              {selectedVendor?.vendor_code && (
                <div>
                  <label className="text-sm font-medium">Vendor ID</label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedVendor.vendor_code} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(selectedVendor.vendor_code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="flex items-center gap-2">
                  <Input value={selectedVendor?.vendor_profiles?.contact_email || selectedVendor?.profile?.email || "N/A"} readOnly />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedVendor?.vendor_profiles?.contact_email || selectedVendor?.profile?.email || "")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {selectedVendor?.generated_password && (
                <div>
                  <label className="text-sm font-medium">Generated Password</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={selectedVendor.generated_password}
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
                      onClick={() => copyToClipboard(selectedVendor.generated_password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share these credentials with the vendor securely
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
                <Label className="text-sm font-medium">Company Name</Label>
                <p className="text-lg">{editingApproval?.vendor_profiles?.company_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-muted-foreground">{editingApproval?.vendor_profiles?.contact_email || "N/A"}</p>
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
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
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
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Approval Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the vendor approval record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rejection Confirmation Dialog */}
        <Dialog open={!!rejectingVendor} onOpenChange={() => setRejectingVendor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" />
                Reject Application
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to reject the application for{" "}
                <strong>{rejectingVendor?.vendor_profiles?.company_name}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Card className="p-4 bg-destructive/5 border-destructive/20">
                <p className="text-sm text-muted-foreground">
                  The vendor will be notified that their application has been rejected and will see:
                </p>
                <p className="text-sm font-medium mt-2 text-destructive">
                  "Your application has been rejected. Please contact Admin for more details."
                </p>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingVendor(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  rejectMutation.mutate(rejectingVendor.user_id);
                  setRejectingVendor(null);
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

export default VendorApprovals;
