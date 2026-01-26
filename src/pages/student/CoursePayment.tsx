import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { CreditCard, CheckCircle2, Clock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PaymentSchedule {
  id: string;
  enrollment_id: string;
  payment_stage: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  courses: {
    title: string;
    base_fee: number;
  } | null;
}

const CoursePayment = () => {
  const navigate = useNavigate();

  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["my-enrollment-for-payment"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(title, base_fee)")
        .eq("student_id", user.id)
        .eq("status", "active")
        .single();

      if (error) throw error;
      return data as Enrollment;
    },
  });

  const { data: paymentSchedules, isLoading: paymentsLoading } = useQuery({
    queryKey: ["my-payment-schedules-detail"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("payment_schedules")
        .select("*")
        .eq("student_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as PaymentSchedule[];
    },
  });

  const { data: advancePayment } = useQuery({
    queryKey: ["my-advance-payment"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("advance_payments")
        .select("amount, status, paid_at")
        .eq("student_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const isLoading = enrollmentLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const advanceAmount = advancePayment?.amount || 2000;
  const totalCourseFee = enrollment?.courses?.base_fee || 0;
  const remainingFee = totalCourseFee - advanceAmount;

  const paidAmount = (paymentSchedules || [])
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0) + advanceAmount;

  const totalAmount = totalCourseFee;
  const overduePayments = (paymentSchedules || []).filter(p => p.status === "overdue" || (p.status === "pending" && isPast(new Date(p.due_date))));
  const pendingPayments = (paymentSchedules || []).filter(p => p.status !== "paid");
  const allPaid = pendingPayments.length === 0 && paymentSchedules && paymentSchedules.length > 0;

  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "registration": return "Registration Fee";
      case "balance_1": return "Balance Payment 1";
      case "balance_2": return "Balance Payment 2";
      default: return stage;
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "paid") {
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    }
    if (status === "overdue" || (status === "pending" && isPast(new Date(dueDate)))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    const daysLeft = differenceInDays(new Date(dueDate), new Date());
    if (daysLeft <= 3 && daysLeft >= 0) {
      return <Badge className="bg-amber-500 text-white">Due in {daysLeft} days</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Course Payment</h1>
          <p className="text-muted-foreground">
            View and manage your course payment schedule
          </p>
        </div>

        {/* Course Info */}
        {enrollment?.courses && (
          <Card className="p-6 mb-6 border-border/60">
            <h2 className="font-semibold text-lg mb-4">{enrollment.courses.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Course Fee</p>
                <p className="text-2xl font-bold">₹{totalCourseFee.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Enrollment Fee</p>
                <p className="text-2xl font-bold text-green-700">₹{advanceAmount.toLocaleString()}</p>
                <Badge className="mt-1 bg-green-500 text-white text-xs">Paid</Badge>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Remaining Payable</p>
                <p className="text-2xl font-bold">₹{remainingFee.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Progress */}
        <Card className="p-6 mb-6 border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Payment Progress</h3>
            </div>
            {allPaid ? (
              <Badge className="bg-green-500 text-white gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Fully Paid
              </Badge>
            ) : overduePayments.length > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {overduePayments.length} Overdue
              </Badge>
            ) : null}
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">₹{paidAmount.toLocaleString()} / ₹{totalAmount.toLocaleString()}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(progressPercent)}% Complete</p>
          </div>
        </Card>

        {/* Enrollment Fee (Always Paid) */}
        <Card className="p-6 mb-6 border-border/60">
          <h3 className="font-semibold mb-4">Enrollment Fee</h3>
          <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Advance Enrollment Fee</p>
                <p className="text-xs text-muted-foreground">
                  Paid on {advancePayment?.paid_at ? format(new Date(advancePayment.paid_at), "MMM d, yyyy") : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">₹{advanceAmount.toLocaleString()}</span>
              <Badge className="bg-green-500 text-white">Paid</Badge>
            </div>
          </div>
        </Card>

        {/* Installment Schedule */}
        {paymentSchedules && paymentSchedules.length > 0 && (
          <Card className="p-6 border-border/60">
            <h3 className="font-semibold mb-4">Installment Schedule</h3>
            <div className="space-y-3">
              {paymentSchedules.map((payment, index) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    payment.status === "paid" 
                      ? "bg-green-50 border-green-200" 
                      : payment.status === "overdue" || (payment.status === "pending" && isPast(new Date(payment.due_date)))
                        ? "bg-red-50 border-red-200"
                        : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {payment.status === "paid" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        Installment {index + 1}: {getStageLabel(payment.payment_stage)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.status === "paid" 
                          ? `Paid on ${format(new Date(payment.paid_at!), "MMM d, yyyy")}`
                          : `Due: ${format(new Date(payment.due_date), "MMM d, yyyy")}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">₹{Number(payment.amount).toLocaleString()}</span>
                    {getStatusBadge(payment.status, payment.due_date)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pay Now CTA */}
            {pendingPayments.length > 0 && !allPaid && (
              <Button 
                className="w-full mt-6 gap-2" 
                size="lg"
                onClick={() => navigate(`/payment/schedule/${pendingPayments[0].id}`)}
              >
                Pay {getStageLabel(pendingPayments[0].payment_stage)} - ₹{Number(pendingPayments[0].amount).toLocaleString()}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {allPaid && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-700">All Payments Complete!</p>
                <p className="text-sm text-green-600">Thank you for completing your course payment.</p>
              </div>
            )}
          </Card>
        )}

        {/* No payment schedule message */}
        {(!paymentSchedules || paymentSchedules.length === 0) && (
          <Card className="p-6 border-border/60">
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment schedule found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment schedule will appear here once it's set up by the administration.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CoursePayment;
