import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Building2, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VendorAwaitingApproval = () => {
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile-awaiting"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) return null;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Awaiting Approval</h1>
          <p className="text-muted-foreground">
            Your vendor account is pending approval from our team.
          </p>
        </div>

        {vendorProfile && (
          <div className="bg-accent/30 rounded-lg p-4 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{vendorProfile.company_name}</p>
              </div>
            </div>
            {vendorProfile.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{vendorProfile.contact_email}</p>
                </div>
              </div>
            )}
            {vendorProfile.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{vendorProfile.contact_phone}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Our team reviews your application (24-48 hours)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                You receive login credentials via email
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Start posting jobs and connecting with talent
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Once approved, you will receive your login credentials on your registered email.
          </p>

          <Button variant="outline" asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VendorAwaitingApproval;
