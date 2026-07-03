import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, MapPin, Clock, IndianRupee, Search, Loader2, Lock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Job applications are open to all students. Admin reviews before releasing to vendor.
  const eligibility = { eligible: true, reason: '' };
  const eligibilityLoading = false;

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_active", true)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["job-applications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("job_applications")
        .select("job_id, status")
        .eq("student_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("job_applications")
        .insert({ job_id: jobId, student_id: user.id, status: 'submitted' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Application submitted!", description: "Your application has been sent." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredJobs = jobs?.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getApplication = (jobId: string) => applications?.find(a => a.job_id === jobId);
  const hasApplied = (jobId: string) => !!getApplication(jobId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge variant="secondary">Submitted</Badge>;
      case 'reviewed': return <Badge className="bg-blue-500 text-white">Reviewed</Badge>;
      case 'shortlisted': return <Badge className="bg-green-500 text-white">Shortlisted</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Job Opportunities</h1>
            <p className="text-muted-foreground">Find your perfect role in the baking industry</p>
          </div>

          {/* Applications are open to all students; admin gates delivery to vendor. */}



          <Card className="p-4 border-border/60 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title or description..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {isLoading || eligibilityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredJobs && filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const application = getApplication(job.id);
                const applied = !!application;

                return (
                  <Card key={job.id} className="p-6 border-border/60 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                        
                        
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />{job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />{job.type}
                          </span>
                          {job.salary_range && (
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-4 w-4" />{job.salary_range}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">{job.description}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        {applied ? (
                          getStatusBadge(application!.status)
                        ) : (
                          <Button 
                            onClick={() => applyMutation.mutate(job.id)}
                            disabled={!eligibility?.eligible || applyMutation.isPending}
                          >
                            Apply Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Check back later for new opportunities"}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
