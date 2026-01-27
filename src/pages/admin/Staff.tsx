import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, ChefHat, Shield, Search, UserPlus, UserMinus, Loader2, Settings, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type AppRole = "admin" | "student" | "chef";

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
  const [dialogAction, setDialogAction] = useState<"add" | "remove" | "permissions" | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("chef");
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all staff users (only admins and chefs) with their roles
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      // Get all user roles for admins and chefs
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "chef", "super_admin"]);

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const staffUserIds = [...new Set(roles?.map((r) => r.user_id) || [])];

      if (staffUserIds.length === 0) return [];

      // Get profiles for staff users only
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", staffUserIds)
        .order("first_name");

      if (profilesError) throw profilesError;

      // Combine profiles with their roles
      return profiles?.map((profile) => ({
        ...profile,
        roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      }));
    },
  });

  // Fetch permissions for selected user
  const { data: selectedUserPermissions, refetch: refetchPermissions } = useQuery({
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

  // Update local state when permissions are fetched
  useEffect(() => {
    if (selectedUserPermissions) {
      setUserPermissions(selectedUserPermissions);
    }
  }, [selectedUserPermissions]);

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
      toast({
        title: "Error adding role",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save permissions
  const savePermissions = async () => {
    if (!selectedUser?.id) return;
    
    setIsSaving(true);
    try {
      // Get all permission keys
      const allPermissionKeys = PERMISSION_CATEGORIES.flatMap((cat) =>
        cat.permissions.map((p) => p.key)
      );

      // Upsert each permission
      for (const key of allPermissionKeys) {
        const isEnabled = userPermissions[key] || false;
        
        const { error } = await supabase
          .from("staff_permissions")
          .upsert(
            {
              user_id: selectedUser.id,
              permission_key: key,
              is_enabled: isEnabled,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,permission_key" }
          );

        if (error) throw error;
      }

      toast({ title: "Permissions saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", selectedUser.id] });
    } catch (error: any) {
      toast({
        title: "Error saving permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (key: string) => {
    setUserPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleCategoryPermissions = (category: typeof PERMISSION_CATEGORIES[0], enable: boolean) => {
    const newPermissions = { ...userPermissions };
    category.permissions.forEach((p) => {
      newPermissions[p.key] = enable;
    });
    setUserPermissions(newPermissions);
  };

  const filteredUsers = usersWithRoles?.filter((user) => {
    const matchesSearch =
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "chef" && user.roles.includes("chef")) ||
      (roleFilter === "admin" && (user.roles.includes("admin") || user.roles.includes("super_admin")));

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "admin":
        return "destructive";
      case "chef":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "chef":
        return <ChefHat className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const isSuperAdmin = (user: any) => user.roles.includes("super_admin");

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Users & Access Management</h1>
          <p className="text-muted-foreground">
            Manage staff roles and section-level access permissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="chef">Chefs</SelectItem>
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
                  <div className="flex gap-2">
                    {user.roles.map((role: string) => (
                      <Badge
                        key={role}
                        variant={getRoleBadgeVariant(role)}
                        className="gap-1"
                      >
                        {getRoleIcon(role)}
                        {role === "super_admin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
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
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as AppRole)}
            >
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
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addRoleMutation.mutate({
                  userId: selectedUser.id,
                  role: selectedRole,
                })
              }
              disabled={addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Role"
              )}
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
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as AppRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role to remove" />
              </SelectTrigger>
              <SelectContent>
                {selectedUser?.roles
                  .filter((r: string) => r !== "super_admin")
                  .map((role: string) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                removeRoleMutation.mutate({
                  userId: selectedUser.id,
                  role: selectedRole,
                })
              }
              disabled={removeRoleMutation.isPending}
            >
              {removeRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove Role"
              )}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCategoryPermissions(category, true)}
                          >
                            Enable All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCategoryPermissions(category, false)}
                          >
                            Disable All
                          </Button>
                        </div>
                        {category.permissions.map((permission) => (
                          <div
                            key={permission.key}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              id={permission.key}
                              checked={userPermissions[permission.key] || false}
                              onCheckedChange={() => togglePermission(permission.key)}
                            />
                            <label
                              htmlFor={permission.key}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
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
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;
