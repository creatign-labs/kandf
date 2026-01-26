import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, Lock, Eye, Loader2, Mail, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const JobApplications = () => {
  const { id: jobId } = useParams();

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Get total application count (vendor can always see this)
  const { data: totalCount } = useQuery({
    queryKey: ["job-application-count", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("job_applications")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Get released applications (vendor can only see these with student details)
  const { data: releasedApplications, isLoading } = useQuery({
    queryKey: ["released-applications", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select(`
          id,
          status,
          created_at,
          released_at,
          cover_letter,
          student_id,
          resume_url,
          profiles:student_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq("job_id", jobId)
        .eq("released_to_vendor", true)
        .order("released_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const pendingCount = (totalCount || 0) - (releasedApplications?.length || 0);

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/vendor/jobs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </Button>
            <h1 className="text-3xl font-bold mb-2">Applications for {job?.title}</h1>
            <p className="text-muted-foreground">
              View and manage applications for this position
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{releasedApplications?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Released to You</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Lock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Admin Review</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Released Applications */}
          <Card className="border-border/60 mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Released Applicants</h2>
              <p className="text-sm text-muted-foreground">
                These applicants have been reviewed and released to you by platform administrators
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : releasedApplications && releasedApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releasedApplications.map((app) => {
                    const profile = app.profiles as { first_name: string; last_name: string; email: string; phone: string } | null;
                    
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {profile?.first_name} {profile?.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {profile?.email && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {profile.email}
                              </span>
                            )}
                            {profile?.phone && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {profile.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={app.status === "shortlisted" ? "default" : "secondary"}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.released_at && formatDistanceToNow(new Date(app.released_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {app.resume_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                                View Resume
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No applicants released yet</h3>
                <p className="text-muted-foreground">
                  Platform administrators review applications before releasing applicant details to you.
                  <br />
                  You have {totalCount || 0} total applications pending review.
                </p>
              </div>
            )}
          </Card>

          {/* Pending Applications Info */}
          {pendingCount > 0 && (
            <Card className="p-6 border-border/60 bg-accent/20">
              <div className="flex items-start gap-4">
                <Lock className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">
                    {pendingCount} Application{pendingCount !== 1 ? "s" : ""} Pending Review
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These applications are being reviewed by our platform administrators to ensure quality.
                    Applicant details will be released to you once approved.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobApplications;
