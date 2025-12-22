import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Search, Loader2, Crown, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SuperAdminManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dialogAction, setDialogAction] = useState<"grant" | "revoke" | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data } = await supabase.rpc("is_super_admin", { _user_id: session.user.id });
      if (!data) {
        toast({
          title: "Access Denied",
          description: "Only Super Admins can access this page",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }
      setIsSuperAdmin(true);
    };

    checkSuperAdmin();
  }, [navigate]);

  // Fetch all admin users with their super_admin status
  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ["super-admin-management"],
    queryFn: async () => {
      // Get all user_roles entries
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Get users who have admin role
      const adminUserIds = roles
        ?.filter((r) => r.role === "admin")
        .map((r) => r.user_id) || [];

      if (adminUserIds.length === 0) return [];

      // Get profiles for these admin users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", adminUserIds);

      if (profilesError) throw profilesError;

      // Combine profiles with super_admin status
      return profiles?.map((profile) => ({
        ...profile,
        isSuperAdmin: roles?.some(
          (r) => r.user_id === profile.id && r.role === "super_admin"
        ),
        roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      }));
    },
    enabled: isSuperAdmin === true,
  });

  // Grant super_admin role mutation
  const grantSuperAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Super Admin role granted successfully" });
      queryClient.invalidateQueries({ queryKey: ["super-admin-management"] });
      setDialogAction(null);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error granting Super Admin role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke super_admin role mutation
  const revokeSuperAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "super_admin");

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Super Admin role revoked successfully" });
      queryClient.invalidateQueries({ queryKey: ["super-admin-management"] });
      setDialogAction(null);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error revoking Super Admin role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = adminUsers?.filter((user) => {
    const matchesSearch =
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const superAdminCount = adminUsers?.filter((u) => u.isSuperAdmin).length || 0;
  const adminOnlyCount = adminUsers?.filter((u) => !u.isSuperAdmin).length || 0;

  if (isSuperAdmin === null || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <div className="container px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold">Super Admin Management</h1>
          </div>
          <p className="text-muted-foreground">
            Grant or revoke Super Admin privileges for admin users
          </p>
        </div>

        {/* Warning Card */}
        <Card className="p-4 mb-6 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-500">Important Security Notice</h3>
              <p className="text-sm text-muted-foreground">
                Super Admins have full system access including student approvals, inventory checklist approvals, and role management. 
                Only grant this role to trusted administrators.
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{superAdminCount}</p>
              <p className="text-sm text-muted-foreground">Super Admins</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminOnlyCount}</p>
              <p className="text-sm text-muted-foreground">Regular Admins</p>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admin users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Admin Users List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Admin Users</h2>
          <div className="space-y-3">
            {filteredUsers?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    user.isSuperAdmin ? "bg-amber-500/10" : "bg-primary/10"
                  }`}>
                    {user.isSuperAdmin ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : (
                      <span className="text-primary font-semibold">
                        {user.first_name?.[0]?.toUpperCase()}
                        {user.last_name?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {user.first_name} {user.last_name}
                      {user.isSuperAdmin && (
                        <Badge variant="outline" className="border-amber-500 text-amber-500 gap-1">
                          <Crown className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.phone || "No phone"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {user.roles
                      .filter((role: string) => role !== "super_admin")
                      .map((role: string) => (
                        <Badge
                          key={role}
                          variant={role === "admin" ? "destructive" : "secondary"}
                          className="gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                      ))}
                  </div>

                  {user.isSuperAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedUser(user);
                        setDialogAction("revoke");
                      }}
                    >
                      <ShieldOff className="h-4 w-4" />
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-amber-500 hover:text-amber-600"
                      onClick={() => {
                        setSelectedUser(user);
                        setDialogAction("grant");
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Grant
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {(!filteredUsers || filteredUsers.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No admin users found
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Grant Super Admin Dialog */}
      <Dialog open={dialogAction === "grant"} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Grant Super Admin Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to grant Super Admin privileges to{" "}
              <span className="font-semibold">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Card className="p-3 bg-amber-500/5 border-amber-500/20">
              <p className="text-sm text-muted-foreground">
                This user will gain access to:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Student access approvals
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Inventory checklist approvals
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Super Admin role management
                </li>
              </ul>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => grantSuperAdminMutation.mutate(selectedUser.id)}
              disabled={grantSuperAdminMutation.isPending}
            >
              {grantSuperAdminMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Grant Super Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Super Admin Dialog */}
      <Dialog open={dialogAction === "revoke"} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Revoke Super Admin Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke Super Admin privileges from{" "}
              <span className="font-semibold">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Card className="p-3 bg-destructive/5 border-destructive/20">
              <p className="text-sm text-muted-foreground">
                This user will lose access to:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 text-destructive" />
                  Student access approvals
                </li>
                <li className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 text-destructive" />
                  Inventory checklist approvals
                </li>
                <li className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 text-destructive" />
                  Super Admin role management
                </li>
              </ul>
              <p className="text-sm mt-3 text-muted-foreground">
                They will retain their regular Admin role.
              </p>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeSuperAdminMutation.mutate(selectedUser.id)}
              disabled={revokeSuperAdminMutation.isPending}
            >
              {revokeSuperAdminMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Revoke Super Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminManagement;
