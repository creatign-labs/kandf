import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, MapPin, Clock, DollarSign, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

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
        .select("job_id")
        .eq("student_id", user.id);

      if (error) throw error;
      return data.map(app => app.job_id);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("job_applications")
        .insert({
          job_id: jobId,
          student_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the employer.",
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

  const filteredJobs = jobs?.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasApplied = (jobId: string) => applications?.includes(jobId);

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Job Opportunities</h1>
            <p className="text-muted-foreground">
              Find your perfect role in the baking industry
            </p>
          </div>

          <Card className="p-4 border-border/60 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title, company, or skill..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button>Search</Button>
            </div>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredJobs && filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="p-6 border-border/60 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                      <p className="text-lg text-muted-foreground mb-3">{job.company}</p>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.type}
                        </span>
                        {job.salary_range && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.salary_range}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {job.description}
                      </p>

                      <div className="flex gap-2">
                        <Badge variant="secondary">Baking</Badge>
                        <Badge variant="secondary">Food Service</Badge>
                        {job.title.toLowerCase().includes("pastry") && (
                          <Badge variant="secondary">Pastry</Badge>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={() => applyMutation.mutate(job.id)}
                      disabled={hasApplied(job.id) || applyMutation.isPending}
                      className="ml-4"
                    >
                      {hasApplied(job.id) ? "Applied" : "Apply Now"}
                    </Button>
                  </div>
                </Card>
              ))}
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

          <Card className="p-6 border-border/60 mt-8 bg-accent/20">
            <h3 className="font-semibold mb-2">Job Application Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Make sure your resume is up to date before applying</li>
              <li>• Highlight skills and recipes you've learned in your course</li>
              <li>• Download and share your certificates with potential employers</li>
              <li>• Most positions require completion of at least one module</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
