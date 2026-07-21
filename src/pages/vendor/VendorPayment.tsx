import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window { Razorpay: any }
}

const VENDOR_FEE = 5000;
const GST_RATE = 0.18;

const VendorPayment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [checking, setChecking] = useState(true);

  const gst = Math.round(VENDOR_FEE * GST_RATE * 100) / 100;
  const total = VENDOR_FEE + gst;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please register again.", variant: "destructive" });
        navigate("/vendor/signup");
        return;
      }

      // If already paid, jump ahead
      const { data: existing } = await supabase
        .from("vendor_payments" as any)
        .select("status")
        .eq("user_id", session.user.id)
        .eq("status", "paid")
        .maybeSingle();
      if (existing) {
        await supabase.auth.signOut();
        navigate("/vendor/payment/success");
        return;
      }
      setChecking(false);
    })();

    supabase.functions.invoke("get-razorpay-key").then(({ data, error }) => {
      if (!error && data?.key) setRazorpayKey(data.key);
    });

    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
    return () => { if (document.body.contains(s)) document.body.removeChild(s); };
  }, [navigate]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-vendor-payment-order", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;

      const options = {
        key: razorpayKey,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Knead & Frost",
        description: "Vendor Registration Fee",
        order_id: data.order.id,
        prefill: {
          email: session.user.email,
          name: session.user.user_metadata?.first_name || "",
          contact: session.user.user_metadata?.phone || "",
        },
        theme: { color: "#DC2828" },
        handler: async (resp: any) => {
          try {
            const { error: vErr } = await supabase.functions.invoke("verify-vendor-payment", {
              body: {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (vErr) throw vErr;
            await supabase.auth.signOut();
            navigate("/vendor/payment/success");
          } catch (e: any) {
            toast({ title: "Verification failed", description: e.message, variant: "destructive" });
          }
        },
      };
      const rp = new window.Razorpay(options);
      rp.on("payment.failed", (r: any) => {
        toast({ title: "Payment failed", description: r.error?.description || "Try again", variant: "destructive" });
      });
      rp.open();
    } catch (e: any) {
      toast({ title: "Could not start payment", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vendor Registration Fee</h1>
            <p className="text-sm text-muted-foreground">One-time payment to complete registration</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-b border-border py-4 mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registration Fee</span>
            <span>₹{VENDOR_FEE.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST (18%)</span>
            <span>₹{gst.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-primary">₹{total.toLocaleString()}</span>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handlePay} disabled={loading || !razorpayKey}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> :
            !razorpayKey ? "Loading..." : "Pay with Razorpay"}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          After payment, our team will review and email your login credentials once approved.
        </p>
      </Card>
    </div>
  );
};

export default VendorPayment;
