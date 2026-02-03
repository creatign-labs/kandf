import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Shield, Loader2, CheckCircle2, Calendar, User, BookOpen, IndianRupee, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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

interface PaymentDetails {
  schedule: PaymentSchedule;
  studentName: string;
  courseName: string;
  studentEmail: string;
  studentPhone: string | null;
}

const PublicPayment = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      setError(null);

      if (!scheduleId) {
        setError("Invalid payment link");
        setFetchingData(false);
        return;
      }

      try {
        // Fetch Razorpay key
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-razorpay-key');
        if (keyError) {
          console.error('Failed to get Razorpay key:', keyError);
        } else if (keyData?.key) {
          setRazorpayKey(keyData.key);
        }

        // Fetch payment schedule with related data
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('id', scheduleId)
          .single();

        if (scheduleError || !scheduleData) {
          setError("Payment link is invalid or expired");
          setFetchingData(false);
          return;
        }

        if (scheduleData.status === 'paid') {
          setPaymentSuccess(true);
          setFetchingData(false);
          return;
        }

        // Fetch enrollment with course info
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, course_id, courses(title)')
          .eq('id', scheduleData.enrollment_id)
          .single();

        if (enrollmentError || !enrollmentData) {
          setError("Could not load course information");
          setFetchingData(false);
          return;
        }

        // Fetch student profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', scheduleData.student_id)
          .single();

        if (profileError || !profileData) {
          setError("Could not load student information");
          setFetchingData(false);
          return;
        }

        setPaymentDetails({
          schedule: scheduleData,
          studentName: `${profileData.first_name} ${profileData.last_name}`,
          courseName: (enrollmentData.courses as any)?.title || 'Course',
          studentEmail: profileData.email || '',
          studentPhone: profileData.phone,
        });
      } catch (err) {
        console.error('Error loading payment data:', err);
        setError("Failed to load payment information");
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
  }, [scheduleId]);

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'registration': return 'Registration Fee';
      case 'balance_1': return 'Balance Payment 1';
      case 'balance_2': return 'Balance Payment 2';
      default: return stage;
    }
  };

  const handlePayment = async () => {
    if (!paymentDetails) {
      toast({
        title: "Error",
        description: "Missing payment information.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { schedule, studentName, studentEmail, studentPhone, courseName } = paymentDetails;

      // Create Razorpay order - using public endpoint (no auth required)
      const shortId = schedule.id.substring(0, 8);
      const receipt = `pub_${shortId}_${Date.now().toString().slice(-8)}`;
      
      // Fetch enrollment to get course_id
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('id', schedule.enrollment_id)
        .single();

      if (!enrollmentData) {
        throw new Error('Could not find enrollment details');
      }

      // Call the edge function to create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-public-payment-order',
        {
          body: {
            scheduleId: schedule.id,
            amount: Number(schedule.amount),
            receipt,
          },
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: razorpayKey,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Knead & Frost',
        description: `${getStageLabel(schedule.payment_stage)} - ${courseName}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Verify payment via edge function
            const { error: verifyError } = await supabase.functions.invoke(
              'verify-public-payment',
              {
                body: {
                  scheduleId: schedule.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError) throw verifyError;

            setPaymentSuccess(true);
            toast({
              title: "Payment successful!",
              description: `${getStageLabel(schedule.payment_stage)} has been paid successfully.`,
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
          name: studentName,
          email: studentEmail,
          contact: studentPhone || '',
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Link Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-700">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your payment. A confirmation has been sent to your email.
          </p>
          {paymentDetails && (
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">₹{Number(paymentDetails.schedule.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Type</span>
                <span className="font-medium">{getStageLabel(paymentDetails.schedule.payment_stage)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!paymentDetails) {
    return null;
  }

  const { schedule, studentName, courseName } = paymentDetails;
  const isOverdue = new Date(schedule.due_date) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container px-4 text-center">
          <h1 className="text-2xl font-bold">Knead & Frost Academy</h1>
          <p className="text-primary-foreground/80 text-sm">Secure Payment Portal</p>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Payment Info Card */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-6 text-center">Payment Details</h2>
            
            <div className="space-y-4">
              {/* Student Name */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Student Name</p>
                  <p className="font-medium">{studentName}</p>
                </div>
              </div>

              {/* Course */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Course</p>
                  <p className="font-medium">{courseName}</p>
                </div>
              </div>

              {/* Payment Stage */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Payment For</p>
                  <p className="font-medium">{getStageLabel(schedule.payment_stage)}</p>
                </div>
              </div>

              {/* Due Date */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-muted/50'}`}>
                <Calendar className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {format(new Date(schedule.due_date), 'MMMM d, yyyy')}
                    {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Overdue</span>}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <IndianRupee className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Amount to Pay</p>
                  <p className="text-2xl font-bold text-primary">₹{Number(schedule.amount).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Button Card */}
          <Card className="p-6">
            <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secured by Razorpay • 256-bit SSL Encryption</span>
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
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{Number(schedule.amount).toLocaleString()} Now
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              By proceeding, you agree to our terms and conditions.
            </p>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>Having trouble? Contact us at support@knead-frost.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPayment;
