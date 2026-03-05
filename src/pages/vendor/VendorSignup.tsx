import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const vendorSignupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
});

const VendorSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    phone: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast({
        title: "Terms required",
        description: "Please accept the Terms & Conditions.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = vendorSignupSchema.parse(formData);

      setLoading(true);

      // Parse full name
      const nameParts = validated.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      // Generate a temporary random password (will be replaced during approval)
      const tempPassword = crypto.randomUUID();

      // Create Supabase account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: validated.phone,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please log in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (authData.user) {
        // Assign vendor role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "vendor" });

        if (roleError) {
          console.error("Failed to assign vendor role:", roleError);
        }

        // Create vendor profile with pending approval status
        const { data: vendorProfile, error: profileError } = await supabase
          .from("vendor_profiles")
          .insert({
            user_id: authData.user.id,
            company_name: validated.companyName,
            contact_email: validated.email,
            contact_phone: validated.phone,
            approval_status: "pending",
            is_active: false,
          })
          .select()
          .single();

        if (profileError) {
          console.error("Failed to create vendor profile:", profileError);
        }

        // Create approval record
        if (vendorProfile) {
          const { error: approvalError } = await supabase
            .from("vendor_access_approvals")
            .insert({
              user_id: authData.user.id,
              vendor_profile_id: vendorProfile.id,
              status: "pending",
            });

          if (approvalError) {
            console.error("Failed to create approval record:", approvalError);
          }
        }

        // Show success state
        setRegistrationComplete(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Registration in Progress</h1>
            <p className="text-muted-foreground">
              Your vendor registration has been submitted successfully.
            </p>
          </div>
          
          <div className="bg-accent/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">
              Once approved, you will receive your login credentials on your registered email:
            </p>
            <p className="font-medium mt-2">{formData.email}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our team will review your application and get back to you within 24-48 hours.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vendor Registration</h1>
              <p className="text-sm text-muted-foreground">
                Register as a hiring partner
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="Your Company Ltd."
              value={formData.companyName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
              I agree to the Terms & Conditions and Privacy Policy
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              "Initiate Registration"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default VendorSignup;
