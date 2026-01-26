import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Phone, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AccountOnHoldProps {
  status: 'on_hold' | 'rejected';
}

const AccountOnHold = ({ status }: AccountOnHoldProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isRejected = status === 'rejected';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isRejected ? 'bg-destructive/10' : 'bg-amber-500/10'
        }`}>
          <AlertTriangle className={`h-10 w-10 ${
            isRejected ? 'text-destructive' : 'text-amber-500'
          }`} />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {isRejected ? 'Application Rejected' : 'Account On Hold'}
        </h1>

        <p className="text-muted-foreground mb-6">
          {isRejected 
            ? 'Unfortunately, your application has been rejected. Please contact our support team for more information about the decision and next steps.'
            : 'Your account has been temporarily placed on hold. This may be due to pending documentation, payment issues, or administrative review.'
          }
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">Contact Support</h3>
          <div className="space-y-2 text-sm">
            <a
              href="mailto:support@kneadfrost.com"
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              support@kneadfrost.com
            </a>
            <a
              href="tel:+919876543210"
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <Phone className="h-4 w-4" />
              +91 98765 43210
            </a>
          </div>
        </div>

        {!isRejected && (
          <p className="text-sm text-muted-foreground mb-6">
            If you believe this is an error or have completed the required actions, 
            please contact support to have your account reviewed.
          </p>
        )}

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </Card>
    </div>
  );
};

export default AccountOnHold;
