import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const VendorProfile = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company_name: "",
    company_description: "",
    contact_email: "",
    contact_phone: "",
    website: "",
  });

  const { data: vendorProfile, isLoading } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (vendorProfile) {
      setFormData({
        company_name: vendorProfile.company_name || "",
        company_description: vendorProfile.company_description || "",
        contact_email: vendorProfile.contact_email || "",
        contact_phone: vendorProfile.contact_phone || "",
        website: vendorProfile.website || "",
      });
    }
  }, [vendorProfile]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (vendorProfile) {
        const { error } = await supabase
          .from("vendor_profiles")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vendorProfile.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendor_profiles")
          .insert({
            ...data,
            user_id: user.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
      toast({
        title: "Profile updated",
        description: "Your company profile has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter your company name.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Company Profile</h1>
            <p className="text-muted-foreground">
              Manage your company information displayed on job listings
            </p>
          </div>

          <Card className="p-6 border-border/60">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{formData.company_name || "Your Company"}</h2>
                <p className="text-sm text-muted-foreground">
                  {vendorProfile?.is_active ? "Active Vendor" : "Pending Activation"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  placeholder="Your company name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_description">Company Description</Label>
                <Textarea
                  id="company_description"
                  placeholder="Tell candidates about your company..."
                  className="min-h-[100px]"
                  value={formData.company_description}
                  onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="hr@company.com"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    placeholder="+91 98765 43210"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://www.yourcompany.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
