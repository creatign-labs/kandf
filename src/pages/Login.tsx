import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { ChefHat, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = loginSchema.parse({ email, password });

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email not confirmed",
            description: "Please check your email and confirm your account.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Fetch user roles for redirect
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        // Check account_status for students
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_status')
          .eq('id', data.user.id)
          .single();

        // For students, check login eligibility (3 no-shows or expired course)
        const isStudent = roles?.some(r => r.role === 'student') && !roles?.some(r => ['admin', 'super_admin', 'chef'].includes(r.role));
        
        if (isStudent) {
          // Call the database function to check eligibility
          const { data: eligibilityResult, error: eligibilityError } = await supabase
            .rpc('check_student_login_eligibility', { p_user_id: data.user.id });
          
          if (eligibilityError) {
            console.error('Error checking eligibility:', eligibilityError);
          } else if (eligibilityResult) {
            // If function returns a message, login is disabled
            await supabase.auth.signOut();
            toast({
              title: "Login Disabled",
              description: eligibilityResult,
              variant: "destructive",
            });
            return;
          }
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });

        // Redirect based on role priority: super_admin > admin > chef > vendor > student
        if (roles?.some(r => r.role === 'super_admin')) {
          navigate('/admin');
        } else if (roles?.some(r => r.role === 'admin')) {
          navigate('/admin');
        } else if (roles?.some(r => r.role === 'chef')) {
          navigate('/chef');
        } else if (roles?.some(r => r.role === 'vendor')) {
          // Check vendor approval status
          const { data: vendorProfile } = await supabase
            .from('vendor_profiles')
            .select('approval_status')
            .eq('user_id', data.user.id)
            .single();
          
          if (vendorProfile?.approval_status !== 'approved') {
            navigate('/vendor/awaiting-approval');
          } else {
            navigate('/vendor');
          }
        } else {
          // For students, route based on account_status (STATE-BASED ROUTING)
          switch (profile?.account_status) {
            case 'pending':
              // Signed up but hasn't paid advance - go to advance payment
              navigate('/advance-payment');
              break;
            case 'advance_paid':
              // Paid but awaiting Super Admin approval
              navigate('/student/awaiting-approval');
              break;
            case 'on_hold':
              // Account on hold
              navigate('/student/account-hold');
              break;
            case 'rejected':
              // Account rejected
              navigate('/student/account-rejected');
              break;
            case 'active':
            default:
              // Approved and active - go to dashboard
              navigate('/student');
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-16">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Log in to continue your baking journey</p>
          </div>

          <Card className="p-8 border-border/60">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up as Student
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Are you a hiring partner?{" "}
              <Link to="/vendor/signup" className="text-primary font-medium hover:underline">
                Register as Vendor
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
