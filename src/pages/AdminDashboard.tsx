import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Users, TrendingUp, Calendar, Package, AlertCircle, Loader2, ChefHat, FileSpreadsheet, UserCheck, ClipboardList, UtensilsCrossed, Crown, Briefcase, CalendarCheck, Store, CreditCard, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const queryClient = useQueryClient();

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .single();
        setIsSuperAdmin(!!data);
      }
    };
    checkSuperAdmin();
  }, []);

  // Fetch pending approvals count
  const { data: pendingApprovalsCount } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('student_access_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch active students count
  const { data: studentsCount } = useQuery({
    queryKey: ['admin-students-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch new leads this week
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['admin-leads-recent'],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('leads')
        .select('*, courses(title)')
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch all recent leads for display
  const { data: recentLeads } = useQuery({
    queryKey: ['admin-leads-display'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, courses(title)')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch today's batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['admin-todays-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, courses(title)')
        .order('time_slot')
        .limit(5);
      
      if (error) throw error;

      // Get enrollment counts for each batch
      const batchesWithCounts = await Promise.all(
        (data || []).map(async (batch) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('batch_id', batch.id)
            .eq('status', 'active');
          
          return {
            ...batch,
            studentCount: count || 0
          };
        })
      );

      return batchesWithCounts;
    }
  });

  // Master toggle for all batches booking
  const masterToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("batches")
        .update({ booking_enabled: enabled, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["admin-todays-batches"] });
      toast({
        title: enabled ? "All bookings enabled" : "All bookings disabled",
        description: enabled
          ? "Slot booking is now open for all batches."
          : "Slot booking is now closed for all batches.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate booking status from batches data
  const allBookingsEnabled = batchesData?.every((b) => b.booking_enabled ?? true) ?? true;
  const someBookingsEnabled = batchesData?.some((b) => b.booking_enabled ?? true) ?? false;

  // Fetch items that need to be purchased (low stock)
  const { data: stockToPurchase } = useQuery({
    queryKey: ['admin-stock-to-purchase'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .lt('current_stock', supabase.rpc ? 10 : 10) // items below reorder level
        .order('current_stock')
        .limit(5);
      
      if (error) throw error;
      // Filter items where current_stock < reorder_level
      return data?.filter(item => item.current_stock < item.reorder_level) || [];
    }
  });

  const isLoading = leadsLoading || batchesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role={isSuperAdmin ? "super_admin" : "admin"} userName={isSuperAdmin ? "Super Admin" : "Admin"} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const getStageVariant = (stage: string) => {
    switch (stage) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "visited": return "outline";
      case "converted": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role={isSuperAdmin ? "super_admin" : "admin"} userName={isSuperAdmin ? "Super Admin" : "Admin"} />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor academy operations and manage all aspects</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatsCard
            title="Active Students"
            value={String(studentsCount || 0)}
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="New Leads"
            value={String(leadsData?.length || 0)}
            icon={TrendingUp}
            variant="success"
            description="This week"
          />
          <StatsCard
            title="Active Batches"
            value={String(batchesData?.length || 0)}
            icon={Calendar}
            variant="warning"
          />
          <StatsCard
            title="Stock to Purchase"
            value={String(stockToPurchase?.length || 0)}
            icon={AlertCircle}
            variant="default"
            description="Items below reorder level"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Recent Leads */}
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold mb-1">Recent Leads</h2>
                  <p className="text-xs md:text-sm text-muted-foreground">Manage your sales pipeline</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/leads">View All</Link>
                </Button>
              </div>

              <div className="space-y-3">
                {recentLeads?.map((lead) => (
                  <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm md:text-base truncate">{lead.name}</div>
                        <div className="text-xs md:text-sm text-muted-foreground truncate">{lead.courses?.title || 'No course'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 ml-11 sm:ml-0">
                      <Badge variant={getStageVariant(lead.stage)} className="text-xs">
                        {lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1)}
                      </Badge>
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {(!recentLeads || recentLeads.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No recent leads</p>
                )}
              </div>
            </Card>

            {/* Master Booking Toggle */}
            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Master Booking Control</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable slot booking for all batches
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {allBookingsEnabled ? "All Open" : someBookingsEnabled ? "Partial" : "All Closed"}
                  </span>
                  <Switch
                    checked={allBookingsEnabled}
                    onCheckedChange={(checked) => masterToggleMutation.mutate(checked)}
                    disabled={masterToggleMutation.isPending}
                  />
                </div>
              </div>
            </Card>

            {/* Today's Classes */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Active Batches</h2>
                  <p className="text-sm text-muted-foreground">All running batches</p>
                </div>
              </div>

              <div className="space-y-3">
                {batchesData?.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-medium text-primary">{batch.time_slot}</div>
                      </div>
                      <div>
                        <div className="font-medium">{batch.courses?.title}</div>
                        <div className="text-sm text-muted-foreground">{batch.batch_name} • {batch.days}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={batch.studentCount === batch.total_seats ? "default" : "outline"}>
                        {batch.studentCount}/{batch.total_seats} students
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!batchesData || batchesData.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No active batches</p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
          {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {isSuperAdmin && (
                  <Button variant="outline" className="w-full justify-start relative" asChild>
                    <Link to="/admin/student-approvals">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Student Approvals
                      {pendingApprovalsCount !== undefined && pendingApprovalsCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {pendingApprovalsCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/admin/vendor-approvals">
                      <Store className="h-4 w-4 mr-2" />
                      Vendor Approvals
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/leads">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Manage Leads
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/recipes">
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    Recipe Library
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/inventory-checklist">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Inventory Checklist
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/staff">
                    <Shield className="h-4 w-4 mr-2" />
                    Users and Access Management
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/data-template">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Data Management Centre
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/job-applications">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Job Applications
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/student-payments">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Student Payment Status
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Stock to Purchase */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Stock to Purchase</h3>
              </div>
              {stockToPurchase && stockToPurchase.length > 0 ? (
                <div className="space-y-3">
                  {stockToPurchase.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Current: {item.current_stock} {item.unit} (Need: {item.reorder_level} {item.unit})
                      </div>
                    </div>
                  ))}
                  <Button variant="link" size="sm" className="w-full" asChild>
                    <Link to="/admin/inventory">View All Stock</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All stock levels are adequate</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;