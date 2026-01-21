import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
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

export const PaymentStatusCard = () => {
  const navigate = useNavigate();

  const { data: paymentSchedules, isLoading } = useQuery({
    queryKey: ["my-payment-schedules"],
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

  if (isLoading || !paymentSchedules || paymentSchedules.length === 0) {
    return null;
  }

  const paidAmount = paymentSchedules
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalAmount = paymentSchedules.reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingPayments = paymentSchedules.filter(p => p.status !== "paid");
  const overduePayments = paymentSchedules.filter(p => p.status === "overdue");
  const nextPayment = pendingPayments[0];

  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "registration": return "Registration";
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
    if (daysLeft <= 3) {
      return <Badge className="bg-amber-500 text-white">Due in {daysLeft} days</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Payment Status</h3>
        </div>
        {overduePayments.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {overduePayments.length} Overdue
          </Badge>
        )}
      </div>

      {/* Payment Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Payment Progress</span>
          <span className="font-medium">₹{paidAmount.toLocaleString()} / ₹{totalAmount.toLocaleString()}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Payment Schedule */}
      <div className="space-y-3">
        {paymentSchedules.map((payment) => (
          <div
            key={payment.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              payment.status === "paid" 
                ? "bg-green-50 border-green-200" 
                : payment.status === "overdue" 
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
                <p className="font-medium text-sm">{getStageLabel(payment.payment_stage)}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.status === "paid" 
                    ? `Paid on ${format(new Date(payment.paid_at!), "MMM d, yyyy")}`
                    : `Due: ${format(new Date(payment.due_date), "MMM d, yyyy")}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">₹{Number(payment.amount).toLocaleString()}</span>
              {getStatusBadge(payment.status, payment.due_date)}
            </div>
          </div>
        ))}
      </div>

      {/* Next Payment CTA */}
      {nextPayment && (
        <Button 
          className="w-full mt-4 gap-2" 
          onClick={() => navigate(`/payment/schedule/${nextPayment.id}`)}
        >
          Pay {getStageLabel(nextPayment.payment_stage)} - ₹{Number(nextPayment.amount).toLocaleString()}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
};
