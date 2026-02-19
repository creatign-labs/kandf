import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Edit, Trash2, Users, Loader2, Briefcase } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const VendorJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  // No delete functionality - deactivate only
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["vendor-jobs", vendorProfile?.id],
    enabled: !!vendorProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("vendor_id", vendorProfile!.id)
        .order("posted_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: applicationCounts } = useQuery({
    queryKey: ["job-application-counts", vendorProfile?.id],
    enabled: !!vendorProfile?.id && !!jobs?.length,
    queryFn: async () => {
      if (!jobs) return {};
      
      const jobIds = jobs.map(j => j.id);
      const counts: Record<string, number> = {};
      
      for (const jobId of jobIds) {
        const { count } = await supabase
          .from("job_applications")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId);
        counts[jobId] = count || 0;
      }
      
      return counts;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ jobId, isActive }: { jobId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-jobs"] });
      toast({ title: "Job status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update job", variant: "destructive" });
    },
  });

  // No delete - deactivate only (no hard deletes allowed)

  const filteredJobs = jobs?.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
              <p className="text-muted-foreground">
                Manage your job postings and track applications
              </p>
            </div>
            <Button asChild>
              <Link to="/vendor/jobs/new">
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Link>
            </Button>
          </div>

          <Card className="p-4 border-border/60 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title or location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredJobs && filteredJobs.length > 0 ? (
            <Card className="border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{applicationCounts?.[job.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={job.is_active ? "default" : "secondary"}>
                          {job.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/vendor/jobs/${job.id}/applications`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/vendor/jobs/${job.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActiveMutation.mutate({ jobId: job.id, isActive: job.is_active })}
                          >
                            {job.is_active ? "⏸" : "▶"}
                          </Button>
                          {/* No delete - deactivate only */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="p-8 text-center border-border/60">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first job posting to start receiving applications
              </p>
              <Button asChild>
                <Link to="/vendor/jobs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Link>
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* No delete dialog - jobs can only be deactivated */}
    </div>
  );
};

export default VendorJobs;
