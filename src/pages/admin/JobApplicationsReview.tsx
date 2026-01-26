import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Loader2, Search, Send, ExternalLink, FileText, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

const JobApplicationsReview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();
        setIsSuperAdmin(!!data);
      }
    };
    checkSuperAdmin();
  }, []);

  // Fetch all job applications with related data
  const { data: applications, isLoading } = useQuery({
    queryKey: ['admin-job-applications', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          jobs(id, title, company, location, type, vendor_id),
          profiles:student_id(id, first_name, last_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'released') {
        query = query.eq('released_to_vendor', true);
      } else if (statusFilter === 'pending') {
        query = query.eq('released_to_vendor', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Release application to vendor mutation
  const releaseMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.rpc('release_application_to_vendor', {
        p_application_id: applicationId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-job-applications'] });
      toast({
        title: "Application Released",
        description: "The application has been released to the vendor."
      });
      setReleaseDialogOpen(false);
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to release application",
        variant: "destructive"
      });
    }
  });

  const filteredApplications = applications?.filter(app => {
    const studentName = `${app.profiles?.first_name || ''} ${app.profiles?.last_name || ''}`.toLowerCase();
    const jobTitle = app.jobs?.title?.toLowerCase() || '';
    const company = app.jobs?.company?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return studentName.includes(search) || jobTitle.includes(search) || company.includes(search);
  });

  const handleReleaseClick = (application: any) => {
    setSelectedApplication(application);
    setReleaseDialogOpen(true);
  };

  const getStatusBadge = (app: any) => {
    if (app.released_to_vendor) {
      return <Badge className="bg-green-500 hover:bg-green-600">Released</Badge>;
    }
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role={isSuperAdmin ? "super_admin" : "admin"} userName={isSuperAdmin ? "Super Admin" : "Admin"} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const pendingCount = applications?.filter(a => !a.released_to_vendor).length || 0;
  const releasedCount = applications?.filter(a => a.released_to_vendor).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role={isSuperAdmin ? "super_admin" : "admin"} userName={isSuperAdmin ? "Super Admin" : "Admin"} />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Job Applications Review</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Review student applications and release them to vendors
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{releasedCount}</p>
                <p className="text-sm text-muted-foreground">Released</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{applications?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Applications</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, job title, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="released">Released to Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Applications Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Job Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications?.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {app.profiles?.first_name} {app.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{app.jobs?.title}</p>
                      <p className="text-sm text-muted-foreground">{app.jobs?.type}</p>
                    </TableCell>
                    <TableCell>
                      <p>{app.jobs?.company}</p>
                      <p className="text-sm text-muted-foreground">{app.jobs?.location}</p>
                    </TableCell>
                    <TableCell>
                      {format(new Date(app.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(app)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {app.resume_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(app.resume_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        {!app.released_to_vendor && (
                          <Button
                            size="sm"
                            onClick={() => handleReleaseClick(app)}
                            disabled={releaseMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Release
                          </Button>
                        )}
                        {app.released_to_vendor && (
                          <span className="text-sm text-muted-foreground italic">
                            Released {app.released_at && format(new Date(app.released_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredApplications || filteredApplications.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No applications found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Release Confirmation Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Release Application to Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to release this application? The vendor will be able to see the student's contact information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="py-4 space-y-3">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">
                  {selectedApplication.profiles?.first_name} {selectedApplication.profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedApplication.profiles?.email}</p>
                {selectedApplication.profiles?.phone && (
                  <p className="text-sm text-muted-foreground">{selectedApplication.profiles?.phone}</p>
                )}
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Applying for:</p>
                <p className="font-medium">{selectedApplication.jobs?.title}</p>
                <p className="text-sm">{selectedApplication.jobs?.company}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedApplication && releaseMutation.mutate(selectedApplication.id)}
              disabled={releaseMutation.isPending}
            >
              {releaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Release to Vendor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobApplicationsReview;
