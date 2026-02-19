import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { 
  DollarSign, Users, TrendingUp, Package, Award, AlertTriangle, 
  ClipboardCheck, FileText, Loader2, BarChart3 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SuperAdminDashboard = () => {
  // Revenue
  const { data: revenueData } = useQuery({
    queryKey: ['sa-revenue'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('total_amount, status');
      
      const collected = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;

      const { data: schedules } = await supabase
        .from('payment_schedules')
        .select('amount, status');
      
      const outstanding = schedules?.filter(s => s.status === 'pending' || s.status === 'overdue')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      
      const overdue = schedules?.filter(s => s.status === 'overdue')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      return { collected, outstanding, overdue };
    }
  });

  // Inventory valuation
  const { data: inventoryVal } = useQuery({
    queryKey: ['sa-inventory-val'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('current_stock, cost_per_unit');
      return data?.reduce((sum, i) => sum + (i.current_stock * (i.cost_per_unit || 0)), 0) || 0;
    }
  });

  // Completion rate
  const { data: completionRate } = useQuery({
    queryKey: ['sa-completion'],
    queryFn: async () => {
      const { data } = await supabase.from('enrollments').select('status');
      const total = data?.length || 1;
      const completed = data?.filter(e => e.status === 'completed').length || 0;
      return Math.round((completed / total) * 100);
    }
  });

  // Pending approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ['sa-pending-approvals'],
    queryFn: async () => {
      const { count } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    }
  });

  // No-show trend
  const { data: noShowCount } = useQuery({
    queryKey: ['sa-noshow-trend'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'no_show')
        .gte('created_at', thirtyDaysAgo.toISOString());
      return count || 0;
    }
  });

  // Placement (hired applications)
  const { data: placementCount } = useQuery({
    queryKey: ['sa-placements'],
    queryFn: async () => {
      const { count } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_status', 'hired');
      return count || 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header role="super_admin" userName="Super Admin" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Executive Dashboard</h1>
          <p className="text-muted-foreground">Financial overview & governance controls</p>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
          <StatsCard
            title="Revenue Collected"
            value={`₹${((revenueData?.collected || 0) / 1000).toFixed(1)}k`}
            icon={DollarSign}
            variant="success"
          />
          <StatsCard
            title="Outstanding"
            value={`₹${((revenueData?.outstanding || 0) / 1000).toFixed(1)}k`}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatsCard
            title="Inventory Value"
            value={`₹${((inventoryVal || 0) / 1000).toFixed(1)}k`}
            icon={Package}
            variant="default"
          />
          <StatsCard
            title="Completion Rate"
            value={`${completionRate || 0}%`}
            icon={Award}
            variant="primary"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <StatsCard
            title="Pending Approvals"
            value={String(pendingApprovals || 0)}
            icon={ClipboardCheck}
            variant={pendingApprovals ? "warning" : "default"}
          />
          <StatsCard
            title="No-Shows (30d)"
            value={String(noShowCount || 0)}
            icon={Users}
            variant="default"
          />
          <StatsCard
            title="Placements"
            value={String(placementCount || 0)}
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="Overdue Payments"
            value={`₹${((revenueData?.overdue || 0) / 1000).toFixed(1)}k`}
            icon={DollarSign}
            variant="warning"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Approval Center
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Review pending requests from admins
            </p>
            <Button asChild className="w-full">
              <Link to="/admin/approvals">
                View Requests {pendingApprovals ? `(${pendingApprovals})` : ''}
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Financial Ledger
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              View full payment history and manage adjustments
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/admin/student-payments">View Ledger</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Logs
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track all system actions and changes
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/admin/audit-logs">View Logs</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
