import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChefHat, ShieldX, ArrowRight } from "lucide-react";

const SignupDisabled = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="inline-flex p-4 rounded-2xl bg-destructive/10 mb-6">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Student Registration Closed
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Student self-registration is currently not available. All student enrollments 
            are handled directly by our administration team.
          </p>

          <Card className="p-6 border-border/60 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Want to join Knead & Frost?</h3>
                <p className="text-sm text-muted-foreground">Contact our admissions team</p>
              </div>
            </div>
            
            <div className="space-y-3 text-left text-sm">
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">+91 98765 43210</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">admissions@kneadandfrost.com</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Visit</span>
                <span className="font-medium">Our campus for a tour</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Link to="/enquiry">
              <Button className="w-full" size="lg">
                Submit Enquiry
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            
            <Link to="/login">
              <Button variant="outline" className="w-full" size="lg">
                Already have an account? Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupDisabled;
