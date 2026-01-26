import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Shield, ArrowLeft, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentSchedule {
  id: string;
  enrollment_id: string;
  student_id: string;
  payment_stage: string;
  amount: number;
  due_date: string;
  status: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  courses: {
    title: string;
  };
}

const SchedulePayment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to continue with payment.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setUser(session.user);

      // Fetch Razorpay key
      const { data: keyData, error: keyError } = await supabase.functions.invoke('get-razorpay-key');
      if (keyError) {
        console.error('Failed to get Razorpay key:', keyError);
        toast({
          title: "Configuration error",
          description: "Payment system not configured properly.",
          variant: "destructive",
        });
      } else if (keyData?.key) {
        setRazorpayKey(keyData.key);
      }

      // Fetch payment schedule
      if (id) {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('id', id)
          .eq('student_id', session.user.id)
          .single();

        if (scheduleError || !scheduleData) {
          toast({
            title: "Payment not found",
            description: "Could not find the payment schedule.",
            variant: "destructive",
          });
          navigate('/student/course-payment');
          return;
        }

        if (scheduleData.status === 'paid') {
          toast({
            title: "Already paid",
            description: "This payment has already been completed.",
          });
          navigate('/student/course-payment');
          return;
        }

        setSchedule(scheduleData);

        // Fetch enrollment with course info
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id, course_id, courses(title)')
          .eq('id', scheduleData.enrollment_id)
          .single();

        if (enrollmentData) {
          setEnrollment(enrollmentData as unknown as Enrollment);
        }
      }

      setFetchingData(false);
    };

    loadData();

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [id, navigate]);

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'registration': return 'Registration Fee';
      case 'balance_1': return 'Balance Payment 1';
      case 'balance_2': return 'Balance Payment 2';
      default: return stage;
    }
  };

  const handlePayment = async () => {
    if (!user || !schedule || !enrollment) {
      toast({
        title: "Error",
        description: "Missing payment information.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount: Number(schedule.amount),
            currency: 'INR',
            receipt: `schedule_${schedule.id.substring(0, 8)}_${Date.now()}`,
            courseId: enrollment.course_id,
            batchId: enrollment.id, // Using enrollment_id as reference
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
        description: `${getStageLabel(schedule.payment_stage)} - ${enrollment.courses?.title || 'Course Payment'}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Update payment schedule status
            const { error: updateError } = await supabase
              .from('payment_schedules')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_id: response.razorpay_payment_id,
              })
              .eq('id', schedule.id);

            if (updateError) throw updateError;

            // Check if all payments are complete (exclude the one just paid)
            const { data: pendingPayments } = await supabase
              .from('payment_schedules')
              .select('id')
              .eq('enrollment_id', enrollment.id)
              .neq('id', schedule.id)
              .in('status', ['pending', 'overdue']);

            // If no pending payments, update enrollment payment_completed flag
            if (!pendingPayments || pendingPayments.length === 0) {
              await supabase
                .from('enrollments')
                .update({ payment_completed: true })
                .eq('id', enrollment.id);
            }

            toast({
              title: "Payment successful!",
              description: `${getStageLabel(schedule.payment_stage)} has been paid successfully.`,
            });

            navigate("/student/course-payment");
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

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="container px-6 py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!schedule || !enrollment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6 gap-2"
            onClick={() => navigate('/student/course-payment')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payment Schedule
          </Button>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">{getStageLabel(schedule.payment_stage)}</h1>
            <p className="text-muted-foreground">
              Complete your payment for {enrollment.courses?.title}
            </p>
          </div>

          <div className="grid gap-6">
            {/* Payment Details Card */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{enrollment.courses?.title}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Payment Type</span>
                  <span className="font-medium">{getStageLabel(schedule.payment_stage)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{new Date(schedule.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <span className="text-lg font-semibold">Amount to Pay</span>
                  <span className="text-2xl font-bold text-primary">₹{Number(schedule.amount).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Payment Button Card */}
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
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : !razorpayKey ? (
                  "Loading..."
                ) : (
                  `Pay ₹${Number(schedule.amount).toLocaleString()} Now`
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By proceeding, you agree to our terms and conditions.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePayment;
