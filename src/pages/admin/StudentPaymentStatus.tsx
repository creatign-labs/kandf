import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, CreditCard, Loader2, CheckCircle, Clock, AlertTriangle, Copy, Link2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const StudentPaymentStatus = () => {
  const BASE_URL = window.location.origin;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all payment schedules with student and enrollment info
  const { data: paymentData, isLoading } = useQuery({
    queryKey: ["admin-student-payment-status"],
    queryFn: async () => {
      const { data: schedules, error } = await supabase
        .from("payment_schedules")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Fetch student profiles for each schedule
      const uniqueStudentIds = [...new Set(schedules?.map(s => s.student_id) || [])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", uniqueStudentIds);

      // Fetch enrollments for course info
      const uniqueEnrollmentIds = [...new Set(schedules?.map(s => s.enrollment_id) || [])];
      
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(title)")
        .in("id", uniqueEnrollmentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const enrollmentMap = new Map(enrollments?.map(e => [e.id, e]) || []);

      return schedules?.map(schedule => ({
        ...schedule,
        student: profileMap.get(schedule.student_id),
        enrollment: enrollmentMap.get(schedule.enrollment_id),
      })) || [];
    },
  });

  // Calculate stats
  const stats = {
    total: paymentData?.length || 0,
    paid: paymentData?.filter(p => p.status === "paid").length || 0,
    pending: paymentData?.filter(p => p.status === "pending").length || 0,
    overdue: paymentData?.filter(p => p.status === "overdue" || (p.status === "pending" && new Date(p.due_date) < new Date())).length || 0,
  };

  const filteredData = paymentData?.filter((payment) => {
    const studentName = `${payment.student?.first_name || ""} ${payment.student?.last_name || ""}`.toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.toLowerCase()) ||
      payment.student?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isActuallyOverdue = payment.status === "overdue" || 
      (payment.status === "pending" && new Date(payment.due_date) < new Date());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "overdue" ? isActuallyOverdue : payment.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === "pending" && new Date(dueDate) < new Date();
    
    if (status === "paid") {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    }
    if (isOverdue || status === "overdue") {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const copyPaymentLink = (scheduleId: string) => {
    const link = `${BASE_URL}/pay/${scheduleId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Payment link copied!",
      description: "Share this link with the student to collect payment.",
    });
  };

  const formatStage = (stage: string) => {
    switch (stage) {
      case "registration": return "Registration Fee";
      case "balance_1": return "Balance 1";
      case "balance_2": return "Balance 2";
      default: return stage;
    }
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Student Payment Status</h1>
          <p className="text-muted-foreground">Track all student payment schedules and statuses</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Installments</div>
          </Card>
          <Card className="p-4 border-green-500/20 bg-green-500/5">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </Card>
          <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </Card>
          <Card className="p-4 border-red-500/20 bg-red-500/5">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Payments Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Payment Stage</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payment.student?.first_name} {payment.student?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.student?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{payment.enrollment?.courses?.title || "N/A"}</TableCell>
                  <TableCell>{formatStage(payment.payment_stage)}</TableCell>
                  <TableCell className="font-medium">₹{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(payment.due_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {payment.paid_at ? format(new Date(payment.paid_at), "dd MMM yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {payment.status === "paid" ? (
                      <span className="text-sm font-mono">{(payment as any).payment_reference || "—"}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status, payment.due_date)}</TableCell>
                  <TableCell className="text-right">
                    {payment.status !== "paid" && (
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPaymentLink(payment.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Payment Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`${BASE_URL}/pay/${payment.id}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open Payment Page</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
               {(!filteredData || filteredData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment records found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default StudentPaymentStatus;
