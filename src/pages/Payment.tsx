import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { course, batch, fee, courseId, batchId } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to continue with payment.",
          variant: "destructive",
        });
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    // Fetch Razorpay key from backend
    supabase.functions.invoke('get-razorpay-key').then(({ data, error }) => {
      if (error) {
        console.error('Failed to get Razorpay key:', error);
        toast({
          title: "Configuration error",
          description: "Payment system not configured properly.",
          variant: "destructive",
        });
      } else if (data?.key) {
        setRazorpayKey(data.key);
      }
    });

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [navigate]);

  const gstAmount = fee * 0.18;
  const totalAmount = fee + gstAmount;

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount: totalAmount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            courseId,
            batchId,
          },
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: razorpayKey,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Knead & Frost',
        description: course,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  courseId,
                  batchId,
                  amount: fee,
                  gstAmount,
                  totalAmount,
                },
                headers: {
                  Authorization: `Bearer ${session.session?.access_token}`,
                },
              }
            );

            if (verifyError) throw verifyError;

            toast({
              title: "Payment successful",
              description: "Your enrollment has been confirmed!",
            });

            navigate("/payment/success", {
              state: {
                course,
                batch,
                fee: totalAmount,
                enrollmentId: verifyData.enrollment.id,
              },
            });
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment verification failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user.user_metadata?.first_name || '',
          email: user.email,
          contact: user.user_metadata?.phone || '',
        },
        theme: {
          color: '#8B5CF6',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        toast({
          title: "Payment failed",
          description: response.error.description,
          variant: "destructive",
        });
      });
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
            <p className="text-muted-foreground">Secure payment powered by Razorpay</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6 border-border/60">
                <h3 className="font-semibold mb-4">Payment Details</h3>
                <p className="text-muted-foreground mb-6">
                  Click the button below to proceed with secure payment via Razorpay.
                  You'll be able to pay using Cards, UPI, Net Banking, and Wallets.
                </p>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePayment}
                  disabled={loading || !razorpayKey}
                >
                  {loading ? "Processing..." : !razorpayKey ? "Loading..." : "Pay with Razorpay"}
                </Button>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-border/60">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Course</p>
                    <p className="font-medium">{course}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Batch</p>
                    <p className="font-medium">Batch {batch}</p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Course Fee</span>
                      <span>₹{fee?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span>₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-border font-bold text-lg">
                      <span>Total Amount</span>
                      <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/60">
                <h3 className="font-semibold mb-3">Secure Payment</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ 256-bit SSL encryption</p>
                  <p>✓ PCI DSS compliant</p>
                  <p>✓ Multiple payment options</p>
                  <p>✓ Instant confirmation</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
