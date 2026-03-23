import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { 
  IndianRupee, Users, TrendingUp, Package, Award, AlertTriangle, 
  ClipboardCheck, FileText, BarChart3 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useMemo } from "react";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const SuperAdminDashboard = () => {
  // Revenue
  const { data: revenueData } = useQuery({
    queryKey: ['sa-revenue'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('total_amount, status, payment_date');
      
      const collected = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;

      const { data: schedules } = await supabase
        .from('payment_schedules')
        .select('amount, status');
      
      const outstanding = schedules?.filter(s => s.status === 'pending' || s.status === 'overdue')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      
      const overdue = schedules?.filter(s => s.status === 'overdue')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      return { collected, outstanding, overdue, payments: payments || [] };
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

  // Placement
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

  // Attendance trend (last 30 days)
  const { data: attendanceTrend } = useQuery({
    queryKey: ['sa-attendance-trend'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from('attendance')
        .select('class_date, status')
        .gte('class_date', thirtyDaysAgo.toISOString().split('T')[0]);
      return data || [];
    }
  });

  // Enrollment funnel
  const { data: enrollmentFunnel } = useQuery({
    queryKey: ['sa-enrollment-funnel'],
    queryFn: async () => {
      const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { count: enrolledCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
      const { count: activeCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: completedCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'completed');
      return [
        { stage: "Leads", count: leadsCount || 0 },
        { stage: "Enrolled", count: enrolledCount || 0 },
        { stage: "Active", count: activeCount || 0 },
        { stage: "Completed", count: completedCount || 0 },
      ];
    }
  });

  // Monthly revenue chart data
  const monthlyRevenue = useMemo(() => {
    if (!revenueData?.payments) return [];
    const months: Record<string, number> = {};
    revenueData.payments
      .filter(p => p.status === 'completed')
      .forEach(p => {
        const month = new Date(p.payment_date).toLocaleString('default', { month: 'short', year: '2-digit' });
        months[month] = (months[month] || 0) + Number(p.total_amount);
      });
    return Object.entries(months).map(([month, amount]) => ({ month, amount: Math.round(amount) })).slice(-6);
  }, [revenueData]);

  // Attendance chart data
  const attendanceChartData = useMemo(() => {
    if (!attendanceTrend) return [];
    const days: Record<string, { present: number; absent: number }> = {};
    attendanceTrend.forEach(a => {
      if (!days[a.class_date]) days[a.class_date] = { present: 0, absent: 0 };
      if (a.status === 'present') days[a.class_date].present++;
      else days[a.class_date].absent++;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString('default', { day: 'numeric', month: 'short' }),
        present: counts.present,
        absent: counts.absent,
      })).slice(-14);
  }, [attendanceTrend]);

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
          <StatsCard title="Revenue Collected" value={`₹${((revenueData?.collected || 0) / 1000).toFixed(1)}k`} icon={IndianRupee} variant="success" />
          <StatsCard title="Outstanding" value={`₹${((revenueData?.outstanding || 0) / 1000).toFixed(1)}k`} icon={AlertTriangle} variant="warning" />
          <StatsCard title="Inventory Value" value={`₹${((inventoryVal || 0) / 1000).toFixed(1)}k`} icon={Package} variant="default" />
          <StatsCard title="Completion Rate" value={`${completionRate || 0}%`} icon={Award} variant="primary" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <StatsCard title="Pending Approvals" value={String(pendingApprovals || 0)} icon={ClipboardCheck} variant={pendingApprovals ? "warning" : "default"} />
          <StatsCard title="No-Shows (30d)" value={String(noShowCount || 0)} icon={Users} variant="default" />
          <StatsCard title="Placements" value={String(placementCount || 0)} icon={TrendingUp} variant="success" />
          <StatsCard title="Overdue Payments" value={`₹${((revenueData?.overdue || 0) / 1000).toFixed(1)}k`} icon={DollarSign} variant="warning" />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No payment data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" strokeWidth={2} name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No attendance data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enrollment Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Enrollment Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentFunnel ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={enrollmentFunnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="stage" className="text-xs" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {enrollmentFunnel.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Approval Center
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Review pending requests from admins</p>
            <Button asChild className="w-full">
              <Link to="/admin/approvals">View Requests {pendingApprovals ? `(${pendingApprovals})` : ''}</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Financial Management
            </h3>
            <p className="text-sm text-muted-foreground mb-4">View ledger, issue refunds, mark payments</p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/admin/financials">Open Financials</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Logs
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Track all system actions and changes</p>
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
