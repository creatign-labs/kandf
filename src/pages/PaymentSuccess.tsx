import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle, Download, Home } from "lucide-react";

const PaymentSuccess = () => {
  const location = useLocation();
  const { course, batch, fee, studentId } = location.state || {};

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">Your enrollment has been confirmed</p>
          </div>

          <Card className="p-8 border-border/60 mb-6">
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <p className="text-sm text-muted-foreground mb-1">Your Student ID</p>
                <p className="text-3xl font-bold text-primary">{studentId}</p>
              </div>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="font-medium">{batch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium">₹{Math.round(fee * 1.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-medium font-mono">TXN{Date.now()}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-accent/50 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You will receive a confirmation email with your course details and login credentials shortly.
              You can now access your student portal to book slots and view course materials.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/student">
                <Home className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              <Download className="h-5 w-5" />
              Download Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
