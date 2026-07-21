import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const VendorPaymentFailed = () => {
  const location = useLocation();
  const reason = (location.state as any)?.reason as string | undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-4">
          We couldn't process your vendor registration payment.
        </p>
        {reason && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-6 text-sm text-foreground text-left">
            <span className="font-medium">Reason: </span>{reason}
          </div>
        )}
        <div className="bg-accent/30 rounded-lg p-4 mb-6 text-sm text-foreground text-left">
          Don't worry — no amount has been charged. If money was deducted, it will
          be refunded by your bank within 5–7 business days. You can safely retry
          the payment below.
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

export default VendorPaymentFailed;
