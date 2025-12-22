import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Loader2, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AwaitingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Fetch advance payment status
  const { data: advancePayment, isLoading: paymentLoading } = useQuery({
    queryKey: ["my-advance-payment", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("advance_payments")
        .select("*, courses(title)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch access approval status
  const { data: accessApproval, isLoading: approvalLoading } = useQuery({
    queryKey: ["my-access-approval", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("student_access_approvals")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Check if approved and redirect
  useEffect(() => {
    if (accessApproval?.status === "approved") {
      navigate("/student");
    }
  }, [accessApproval, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isLoading = paymentLoading || approvalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />

      <div className="container px-6 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Awaiting Approval</h1>
          <p className="text-muted-foreground">
            Your enrollment is being processed. Please wait for admin approval.
          </p>
        </div>

        <Card className="p-8 border-border/60">
          <div className="space-y-6">
            {/* Payment Status */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className={`p-2 rounded-full ${advancePayment?.status === "paid" ? "bg-green-100" : "bg-yellow-100"}`}>
                {advancePayment?.status === "paid" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Advance Payment</h3>
                  <Badge variant={advancePayment?.status === "paid" ? "default" : "secondary"}>
                    {advancePayment?.status === "paid" ? "Completed" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {advancePayment?.status === "paid"
                    ? `₹${advancePayment.amount} paid for ${advancePayment.courses?.title || "course"}`
                    : "Complete your advance payment to proceed"}
                </p>
                {advancePayment?.paid_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Paid on {new Date(advancePayment.paid_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Approval Status */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Account Approval</h3>
                  <Badge variant="secondary">
                    {accessApproval?.status === "approved" ? "Approved" : "Pending Review"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is being reviewed by our admin team. You will receive your login
                  credentials via email once approved.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h4 className="font-medium text-sm mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>1. Our Super Admin will review your enrollment</li>
                <li>2. You will receive login credentials via email</li>
                <li>3. Use those credentials to access the student portal</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Refresh Status
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AwaitingApproval;
