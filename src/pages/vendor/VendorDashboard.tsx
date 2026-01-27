import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Eye, Plus, TrendingUp, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VendorStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
}

const VendorStatsCard = ({ title, value, icon: Icon, description }: VendorStatsCardProps) => (
  <Card className="p-4 md:p-6 border-border/60 transition-all hover:shadow-md">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold">{value}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="p-2 md:p-3 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
      </div>
    </div>
  </Card>
);

const VendorDashboard = () => {
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: jobStats } = useQuery({
    queryKey: ["vendor-job-stats", vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, is_active")
        .eq("vendor_id", vendorProfile!.id);
      
      if (error) throw error;
      
      const activeJobs = data?.filter(j => j.is_active).length || 0;
      const totalJobs = data?.length || 0;
      
      return { activeJobs, totalJobs };
    },
  });

  // Get released applications that the vendor can see (platform-wide)
  const { data: applicationStats } = useQuery({
    queryKey: ["vendor-application-stats"],
    queryFn: async () => {
      // Get all released applications the vendor can see
      const { count: released } = await supabase
        .from("job_applications")
        .select("*", { count: "exact", head: true })
        .eq("released_to_vendor", true);
      
      return { released: released || 0 };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {vendorProfile?.company_name || "Vendor"}
            </h1>
            <p className="text-muted-foreground">
              Manage your job postings and view released applicants
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <VendorStatsCard
              title="Your Active Jobs"
              value={jobStats?.activeJobs || 0}
              icon={Briefcase}
              description={`${jobStats?.totalJobs || 0} total posted`}
            />
            <VendorStatsCard
              title="Released Applicants"
              value={applicationStats?.released || 0}
              icon={Eye}
              description="Viewable candidates"
            />
            <VendorStatsCard
              title="Platform Jobs"
              value="Browse"
              icon={TrendingUp}
              description="View all job applications"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-border/60">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Post a New Job</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a job listing to reach professionals
                  </p>
                  <Button asChild>
                    <Link to="/vendor/jobs/new">Create Job Posting</Link>
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/60">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">View Released Applicants</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse candidates approved by admins
                  </p>
                  <Button variant="default" asChild>
                    <Link to="/vendor/applications">
                      <Users className="h-4 w-4 mr-2" />
                      View Applicants ({applicationStats?.released || 0})
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/60">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <Briefcase className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Manage Job Listings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View, edit, or deactivate your jobs
                  </p>
                  <Button variant="outline" asChild>
                    <Link to="/vendor/jobs">View All Jobs</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="p-6 border-border/60 bg-accent/20">
            <h3 className="font-semibold mb-2">How Applications Work</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">1.</span>
                Students apply anonymously to your job postings
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">2.</span>
                Platform administrators review applications for quality
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">3.</span>
                Qualified applicant details are released to you for follow-up
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">4.</span>
                You can view application counts in real-time, identities only when released
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
