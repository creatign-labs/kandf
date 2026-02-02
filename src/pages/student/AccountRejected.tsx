import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AccountRejected = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Enrollment Cancelled</CardTitle>
          <CardDescription className="text-base">
            Your enrollment has been cancelled. Please contact our admissions team for assistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Contact Admissions</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>admissions@kandf.com</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            If you believe this is an error, please reach out to our support team 
            and we'll help resolve this as quickly as possible.
          </p>

          <Button onClick={handleLogout} variant="outline" className="w-full">
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountRejected;
