import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, ChefHat, Shield, Search, UserPlus, UserMinus, Loader2, Settings, Save, Trash2, Send, Copy, Check, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type AppRole = "admin" | "student" | "chef" | "inventory_manager";

// Define all available permissions with categories
const PERMISSION_CATEGORIES = [
  {
    category: "Student Management",
    permissions: [
      { key: "view_students", label: "View Students" },
      { key: "manage_enrollments", label: "Manage Enrollments" },
      { key: "view_student_payments", label: "View Student Payments" },
    ],
  },
  {
    category: "Course & Recipe Management",
    permissions: [
      { key: "view_courses", label: "View Courses" },
      { key: "manage_courses", label: "Manage Courses" },
      { key: "view_recipes", label: "View Recipe Library" },
      { key: "manage_recipes", label: "Manage Recipes" },
    ],
  },
  {
    category: "Batch & Booking Management",
    permissions: [
      { key: "view_batches", label: "View Batches" },
      { key: "manage_batches", label: "Manage Batches" },
      { key: "view_bookings", label: "View Bookings" },
      { key: "manage_recipe_batches", label: "Manage Recipe Batches" },
    ],
  },
  {
    category: "Inventory Management",
    permissions: [
      { key: "view_inventory", label: "View Inventory" },
      { key: "manage_inventory", label: "Manage Inventory" },
      { key: "view_inventory_checklist", label: "View Inventory Checklist" },
      { key: "generate_inventory_requirements", label: "Generate Daily Requirements" },
    ],
  },
  {
    category: "Leads & Communications",
    permissions: [
      { key: "view_leads", label: "View Leads" },
      { key: "manage_leads", label: "Manage Leads" },
      { key: "send_notifications", label: "Send Notifications" },
    ],
  },
  {
    category: "Job Portal",
    permissions: [
      { key: "view_job_applications", label: "View Job Applications" },
      { key: "release_applications", label: "Release Applications to Vendors" },
    ],
  },
  {
    category: "Attendance & Progress",
    permissions: [
      { key: "mark_attendance", label: "Mark Attendance" },
      { key: "mark_recipe_complete", label: "Mark Recipe Complete" },
      { key: "view_attendance_reports", label: "View Attendance Reports" },
    ],
  },
  {
    category: "Data Management",
    permissions: [
      { key: "access_data_template", label: "Access Data Management Centre" },
      { key: "export_data", label: "Export Data" },
    ],
  },
];

const Staff = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dialogAction, setDialogAction] = useState<"add" | "remove" | "permissions" | "create" | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("chef");
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "chef" as string,
    password: "",
    staffNumber: "",
  });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  // Get current user ID for self-deletion check
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch all staff users with their roles
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "chef", "super_admin", "inventory_manager"]);

      if (rolesError) throw rolesError;

      const staffUserIds = [...new Set(roles?.map((r) => r.user_id) || [])];
      if (staffUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", staffUserIds)
        .order("first_name");

      if (profilesError) throw profilesError;

      return profiles?.map((profile) => ({
        ...profile,
        roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      }));
    },
  });

  // Fetch permissions for selected user
  const { data: selectedUserPermissions } = useQuery({
    queryKey: ["staff-permissions", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return {};
      
      const { data, error } = await supabase
        .from("staff_permissions")
        .select("permission_key, is_enabled")
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      const permMap: Record<string, boolean> = {};
      data?.forEach((p) => {
        permMap[p.permission_key] = p.is_enabled;
      });
      return permMap;
    },
    enabled: !!selectedUser?.id && dialogAction === "permissions",
  });

  useEffect(() => {
    if (selectedUserPermissions) {
      setUserPermissions(selectedUserPermissions);
    }
  }, [selectedUserPermissions]);

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "create", ...newUser },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create staff");
      return data;
    },
    onSuccess: (data) => {
      setCreatedCreds({ email: data.email, password: data.password });
      toast({ title: "Staff member created successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating staff", description: error.message, variant: "destructive" });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "delete", userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to delete staff");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Staff member deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting staff", description: error.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role added successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setDialogAction(null);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error adding role", description: error.message, variant: "destructive" });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setDialogAction(null);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error removing role", description: error.message, variant: "destructive" });
    },
  });

  // Save permissions
  const savePermissions = async () => {
    if (!selectedUser?.id) return;
    setIsSaving(true);
    try {
      const allPermissionKeys = PERMISSION_CATEGORIES.flatMap((cat) =>
        cat.permissions.map((p) => p.key)
      );

      for (const key of allPermissionKeys) {
        const isEnabled = userPermissions[key] || false;
        const { error } = await supabase
          .from("staff_permissions")
          .upsert(
            { user_id: selectedUser.id, permission_key: key, is_enabled: isEnabled, updated_at: new Date().toISOString() },
            { onConflict: "user_id,permission_key" }
          );
        if (error) throw error;
      }

      toast({ title: "Permissions saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", selectedUser.id] });
    } catch (error: any) {
      toast({ title: "Error saving permissions", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (key: string) => {
    setUserPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategoryPermissions = (category: typeof PERMISSION_CATEGORIES[0], enable: boolean) => {
    const newPermissions = { ...userPermissions };
    category.permissions.forEach((p) => { newPermissions[p.key] = enable; });
    setUserPermissions(newPermissions);
  };

  const sendCredentialsViaEmail = async (email: string, password: string, name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: "Your Staff Login Credentials - Knead & Frost",
          html: `
            <h2>Welcome to Knead & Frost, ${name}!</h2>
            <p>Your staff account has been created. Here are your login credentials:</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Password:</td><td style="padding:8px;font-family:monospace">${password}</td></tr>
            </table>
            <p>Please login at the platform and change your password after first login.</p>
            <p>Best regards,<br/>Knead & Frost Admin Team</p>
          `,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      toast({ title: "Credentials sent via email" });
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
  };

  const sendCredentialsViaWhatsApp = (phone: string, email: string, password: string, name: string) => {
    const message = encodeURIComponent(
      `Hi ${name},\n\nYour Knead & Frost staff login credentials:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease login and change your password.`
    );
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
    toast({ title: "Credentials copied to clipboard" });
  };

  const filteredUsers = usersWithRoles?.filter((user) => {
    const matchesSearch =
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "chef" && user.roles.includes("chef")) ||
      (roleFilter === "admin" && (user.roles.includes("admin") || user.roles.includes("super_admin"))) ||
      (roleFilter === "inventory_manager" && user.roles.includes("inventory_manager"));

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin": return "default" as const;
      case "admin": return "destructive" as const;
      case "chef": return "secondary" as const;
      case "inventory_manager": return "outline" as const;
      default: return "outline" as const;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "chef":
        return <ChefHat className="h-3 w-3" />;
      case "inventory_manager":
        return <Package className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "inventory_manager": return "Inventory Manager";
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const isSuperAdmin = (user: any) => user.roles.includes("super_admin");

  const canDeleteUser = (user: any) => {
    // Can't delete yourself if you're the only super admin
    if (user.id === currentUser?.id && isSuperAdmin(user)) {
      const otherSuperAdmins = usersWithRoles?.filter(
        (u) => u.id !== currentUser?.id && u.roles.includes("super_admin")
      );
      return otherSuperAdmins && otherSuperAdmins.length > 0;
    }
    return true;
  };

  const resetCreateForm = () => {
    setNewUser({ firstName: "", lastName: "", email: "", phone: "", role: "chef", password: "", staffNumber: "" });
    setCreatedCreds(null);
  };

  if (isLoading) {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Users & Access Management</h1>
            <p className="text-muted-foreground">
              Manage staff roles and section-level access permissions
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              resetCreateForm();
              setDialogAction("create");
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add New Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {usersWithRoles?.filter((u) => u.roles.includes("admin") || u.roles.includes("super_admin")).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {usersWithRoles?.filter((u) => u.roles.includes("chef")).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Chefs</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center">
              <Package className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {usersWithRoles?.filter((u) => u.roles.includes("inventory_manager")).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Inventory Managers</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="chef">Chefs</SelectItem>
                <SelectItem value="inventory_manager">Inventory Managers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users List */}
        <Card className="p-6">
          <div className="space-y-3">
            {filteredUsers?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.first_name?.[0]?.toUpperCase()}
                      {user.last_name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email || user.phone || "No contact"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {user.roles.map((role: string) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)} className="gap-1">
                        {getRoleIcon(role)}
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {/* Manage Permissions Button - not for super admins */}
                    {!isSuperAdmin(user) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setUserPermissions({});
                          setDialogAction("permissions");
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setDialogAction("add");
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    {user.roles.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setDialogAction("remove");
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Delete button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(user)}
                      disabled={!canDeleteUser(user)}
                      title={!canDeleteUser(user) ? "Cannot delete: you are the only super admin" : "Delete user"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {(!filteredUsers || filteredUsers.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No staff members found
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Create New Staff Dialog */}
      <Dialog
        open={dialogAction === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogAction(null);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {createdCreds ? "Staff Created — Share Credentials" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {createdCreds
                ? "Share these login credentials with the new staff member."
                : "Fill in the details to create a new staff account."}
            </DialogDescription>
          </DialogHeader>

          {!createdCreds ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={newUser.firstName}
                    onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={newUser.lastName}
                    onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Number</Label>
                <Input
                  value={newUser.staffNumber}
                  onChange={(e) => setNewUser((p) => ({ ...p, staffNumber: e.target.value }))}
                  placeholder="e.g., STF-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Login Password *</Label>
                <Input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Set a password (min 6 chars)"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2 font-mono text-sm">
                  <div><span className="font-semibold">Email:</span> {createdCreds.email}</div>
                  <div><span className="font-semibold">Password:</span> {createdCreds.password}</div>
                </div>
              </Card>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="gap-2 w-full"
                  onClick={() => copyCredentials(createdCreds.email, createdCreds.password)}
                >
                  {copiedCreds ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCreds ? "Copied!" : "Copy Credentials"}
                </Button>
                <Button
                  className="gap-2 w-full"
                  onClick={() =>
                    sendCredentialsViaEmail(
                      createdCreds.email,
                      createdCreds.password,
                      `${newUser.firstName} ${newUser.lastName}`
                    )
                  }
                >
                  <Send className="h-4 w-4" />
                  Send via Email
                </Button>
                {newUser.phone && (
                  <Button
                    variant="secondary"
                    className="gap-2 w-full"
                    onClick={() =>
                      sendCredentialsViaWhatsApp(
                        newUser.phone,
                        createdCreds.email,
                        createdCreds.password,
                        `${newUser.firstName} ${newUser.lastName}`
                      )
                    }
                  >
                    <Send className="h-4 w-4" />
                    Send via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {!createdCreds ? (
              <>
                <Button variant="outline" onClick={() => { setDialogAction(null); resetCreateForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createStaffMutation.mutate()}
                  disabled={
                    createStaffMutation.isPending ||
                    !newUser.firstName ||
                    !newUser.lastName ||
                    !newUser.email ||
                    !newUser.password ||
                    newUser.password.length < 6
                  }
                >
                  {createStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Staff
                </Button>
              </>
            ) : (
              <Button onClick={() => { setDialogAction(null); resetCreateForm(); }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>'s account,
              including their profile, roles, and permissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteStaffMutation.mutate(deleteTarget.id)}
              disabled={deleteStaffMutation.isPending}
            >
              {deleteStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Role Dialog */}
      <Dialog open={dialogAction === "add"} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Add a new role to {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {!selectedUser?.roles.includes("admin") && (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
                {!selectedUser?.roles.includes("chef") && (
                  <SelectItem value="chef">Chef</SelectItem>
                )}
                {!selectedUser?.roles.includes("inventory_manager") && (
                  <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button
              onClick={() => addRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole })}
              disabled={addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Dialog */}
      <Dialog open={dialogAction === "remove"} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Role</DialogTitle>
            <DialogDescription>
              Remove a role from {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role to remove" />
              </SelectTrigger>
              <SelectContent>
                {selectedUser?.roles
                  .filter((r: string) => r !== "super_admin")
                  .map((role: string) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => removeRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole })}
              disabled={removeRoleMutation.isPending}
            >
              {removeRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={dialogAction === "permissions"} onOpenChange={() => setDialogAction(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Access Permissions
            </DialogTitle>
            <DialogDescription>
              Configure section-level access for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Accordion type="multiple" className="w-full" defaultValue={PERMISSION_CATEGORIES.map((_, i) => `item-${i}`)}>
              {PERMISSION_CATEGORIES.map((category, idx) => {
                const enabledCount = category.permissions.filter((p) => userPermissions[p.key]).length;
                const allEnabled = enabledCount === category.permissions.length;
                
                return (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant={allEnabled ? "default" : enabledCount > 0 ? "secondary" : "outline"}>
                          {enabledCount}/{category.permissions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="flex gap-2 mb-3">
                          <Button variant="outline" size="sm" onClick={() => toggleCategoryPermissions(category, true)}>
                            Enable All
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleCategoryPermissions(category, false)}>
                            Disable All
                          </Button>
                        </div>
                        {category.permissions.map((permission) => (
                          <div key={permission.key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                            <Checkbox
                              id={permission.key}
                              checked={userPermissions[permission.key] || false}
                              onCheckedChange={() => togglePermission(permission.key)}
                            />
                            <label htmlFor={permission.key} className="text-sm font-medium cursor-pointer flex-1">
                              {permission.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button onClick={savePermissions} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;
