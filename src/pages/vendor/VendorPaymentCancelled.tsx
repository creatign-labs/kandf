import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const VendorPaymentCancelled = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-6">
          You closed the payment window before completing the transaction.
          No amount has been charged.
        </p>
        <div className="bg-accent/30 rounded-lg p-4 mb-6 text-sm text-foreground text-left">
          Your vendor registration is not complete yet. Please retry the payment
          to activate your account. Your details are safely saved.
        </div>
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link to="/vendor/payment">Retry Payment</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Need help? Contact us at support@kneadandfrost.com
        </p>
      </Card>
    </div>
  );
};

export default VendorPaymentCancelled;
