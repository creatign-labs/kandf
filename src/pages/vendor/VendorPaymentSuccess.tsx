import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const VendorPaymentSuccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for registering as a hiring partner with Knead & Frost.
        </p>
        <div className="bg-accent/30 rounded-lg p-4 mb-6 text-sm text-foreground">
          Our team will review your application. Once approved by the admin,
          your login credentials will be sent to your registered email.
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link to="/">Return to Home</Link>
        </Button>
      </Card>
    </div>
  );
};

export default VendorPaymentSuccess;
