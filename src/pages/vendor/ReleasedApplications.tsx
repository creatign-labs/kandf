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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Eye, Loader2, Mail, Phone, Search, Briefcase, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const VENDOR_STATUSES = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const ReleasedApplications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["all-released-applications"],
    queryFn: async () => {
      const { data: apps, error } = await supabase
        .from("job_applications")
        .select("id, job_id, status, vendor_status, created_at, released_at, cover_letter, student_id, resume_url")
        .eq("released_to_vendor", true)
        .order("released_at", { ascending: false });
      
      if (error) throw error;
      if (!apps || apps.length === 0) return [];
      
      const studentIds = [...new Set(apps.map(app => app.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", studentIds);
      
      const jobIds = [...new Set(apps.map(app => app.job_id))];
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, company, location")
        .in("id", jobIds);
      
      return apps.map(app => ({
        ...app,
        profile: profiles?.find(p => p.id === app.student_id) || null,
        job: jobs?.find(j => j.id === app.job_id) || null
      }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, vendorStatus }: { applicationId: string; vendorStatus: string }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ vendor_status: vendorStatus, updated_at: new Date().toISOString() })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-released-applications"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredApplications = applications?.filter(app => {
    const searchLower = searchQuery.toLowerCase();
    return (
      app.profile?.first_name?.toLowerCase().includes(searchLower) ||
      app.profile?.last_name?.toLowerCase().includes(searchLower) ||
      app.profile?.email?.toLowerCase().includes(searchLower) ||
      app.job?.title?.toLowerCase().includes(searchLower) ||
      app.job?.company?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "shortlisted": return "default";
      case "interview_scheduled": return "secondary";
      case "offered": return "default";
      case "hired": return "default";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Released Applicants</h1>
            <p className="text-muted-foreground">
              View and manage candidates released to you by platform administrators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{applications?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Released</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {applications?.filter(a => a.vendor_status === 'hired').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Hired</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Briefcase className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {applications?.filter(a => a.vendor_status === 'interview_scheduled').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Interviews Scheduled</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 border-border/60 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, job title, or company..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          <Card className="border-border/60">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">All Released Applicants</h2>
              <p className="text-sm text-muted-foreground">
                Update application status as you progress through the hiring process
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredApplications && filteredApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Applied For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.profile?.first_name} {app.profile?.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {app.profile?.email && (
                            <a 
                              href={`mailto:${app.profile.email}`}
                              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Mail className="h-3 w-3" />
                              {app.profile.email}
                            </a>
                          )}
                          {app.profile?.phone && (
                            <a 
                              href={`tel:${app.profile.phone}`}
                              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                              {app.profile.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Briefcase className="h-3 w-3" />
                            {app.job?.title || "Unknown Job"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {app.job?.company}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={app.vendor_status || ""}
                          onValueChange={(value) =>
                            updateStatusMutation.mutate({ applicationId: app.id, vendorStatus: value })
                          }
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue placeholder="Set status..." />
                          </SelectTrigger>
                          <SelectContent>
                            {VENDOR_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {app.released_at && formatDistanceToNow(new Date(app.released_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {app.resume_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 mr-1" />
                              Resume
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No applicants released yet</h3>
                <p className="text-muted-foreground">
                  Platform administrators review applications before releasing candidate details to you.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReleasedApplications;
