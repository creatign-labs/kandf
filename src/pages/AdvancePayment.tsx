import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, CreditCard, Shield, Clock } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const ADVANCE_AMOUNT = 2000;

const AdvancePayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { course, courseId } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');

  useEffect(() => {
    if (!course || !courseId) {
      navigate('/courses');
      return;
    }

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
        checkExistingPayment(session.user.id);
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
  }, [navigate, course, courseId]);

  const checkExistingPayment = async (userId: string) => {
    // Check if user already has a pending or completed advance payment for this course
    const { data: existingPayment } = await supabase
      .from('advance_payments')
      .select('*')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .in('status', ['pending', 'completed'])
      .single();

    if (existingPayment) {
      toast({
        title: "Payment already exists",
        description: "You have already made an advance payment for this course.",
      });
      navigate('/student/awaiting-approval');
    }
  };

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
      
      // Create Razorpay order for advance payment
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-advance-payment-order',
        {
          body: {
            amount: ADVANCE_AMOUNT,
            currency: 'INR',
            receipt: `adv_${Date.now()}`,
            courseId,
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
        description: `Advance Payment - ${course}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-advance-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  courseId,
                  amount: ADVANCE_AMOUNT,
                },
                headers: {
                  Authorization: `Bearer ${session.session?.access_token}`,
                },
              }
            );

            if (verifyError) throw verifyError;

            toast({
              title: "Advance payment successful!",
              description: "Your application is now pending Super Admin approval.",
            });

            navigate("/student/awaiting-approval");
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
          color: '#D97706',
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

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Advance Payment</h1>
            <p className="text-muted-foreground">
              Secure your spot in {course} with an advance payment
            </p>
          </div>

          <div className="grid gap-6">
            {/* Info Card */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How it works</h3>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. Pay ₹2,000 advance to reserve your seat</li>
                    <li>2. Your application will be reviewed by our team</li>
                    <li>3. Upon approval, you'll receive login credentials</li>
                    <li>4. Complete remaining fee payment during enrollment</li>
                  </ol>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Course Details */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Course Selected</h2>
                <div className="space-y-3">
                  <p className="text-lg font-medium">{course}</p>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Advance Payment</span>
                      <span className="font-bold text-xl text-primary">₹{ADVANCE_AMOUNT.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This amount will be adjusted against your total course fee
                    </p>
                  </div>
                </div>
              </Card>

              {/* Benefits */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">What you get</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Reserved seat in your chosen course</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Priority batch selection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Access to course materials after approval</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Dedicated support from our team</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Payment Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">Secure Payment</h3>
                    <p className="text-sm text-muted-foreground">Powered by Razorpay</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>SSL Encrypted</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePayment}
                disabled={loading || !razorpayKey}
              >
                {loading ? "Processing..." : !razorpayKey ? "Loading..." : `Pay ₹${ADVANCE_AMOUNT.toLocaleString()} Now`}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By proceeding, you agree to our terms and conditions. 
                The advance payment is non-refundable once your application is approved.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancePayment;
