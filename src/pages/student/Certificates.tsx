import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Award, Lock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Certificates = () => {
  const { data: certificates, isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          courses (title)
        `)
        .eq("student_id", user.id)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses (title)
        `)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const handleDownload = (title: string) => {
    toast({
      title: "Downloading certificate...",
      description: `${title} will be downloaded shortly.`,
    });
  };

  // Combine certificates with in-progress enrollments
  const allCertificateItems = [
    ...(certificates || []).map(cert => ({
      id: cert.id,
      title: `${cert.courses?.title || "Course"} Certificate`,
      issueDate: cert.issue_date,
      status: "available" as const,
      progress: 100,
      certificateNumber: cert.certificate_number,
    })),
    ...(enrollments || [])
      .filter(enr => !certificates?.some(c => c.course_id === enr.course_id))
      .map(enr => ({
        id: enr.id,
        title: `${enr.courses?.title || "Course"} Certificate`,
        issueDate: null,
        status: (enr.progress || 0) > 0 ? "in-progress" : "locked" as const,
        progress: enr.progress || 0,
        certificateNumber: null,
      })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
            <p className="text-muted-foreground">
              Download and share your achievements
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allCertificateItems.length > 0 ? (
            <div className="space-y-6">
              {allCertificateItems.map((cert) => (
                <Card key={cert.id} className="p-6 border-border/60">
                  <div className="flex items-start gap-6">
                    <div className={`p-4 rounded-2xl ${
                      cert.status === "available"
                        ? "bg-primary/10"
                        : cert.status === "in-progress"
                        ? "bg-amber-100"
                        : "bg-muted"
                    }`}>
                      {cert.status === "available" ? (
                        <Award className="h-10 w-10 text-primary" />
                      ) : cert.status === "in-progress" ? (
                        <Award className="h-10 w-10 text-amber-600" />
                      ) : (
                        <Lock className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{cert.title}</h3>
                          {cert.certificateNumber && (
                            <p className="text-sm text-muted-foreground">#{cert.certificateNumber}</p>
                          )}
                        </div>
                        {cert.status === "available" && (
                          <Badge variant="default" className="gap-1">
                            <Award className="h-3 w-3" />
                            Earned
                          </Badge>
                        )}
                        {cert.status === "in-progress" && (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                        {cert.status === "locked" && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                      </div>

                      {cert.status === "available" ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-900">
                              Certificate Issued: {format(new Date(cert.issueDate!), "MMMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleDownload(cert.title)}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </Button>
                            <Button variant="outline">
                              Share
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{cert.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${cert.progress}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cert.status === "in-progress"
                              ? "Complete all module assessments to earn this certificate"
                              : "Complete all previous modules to unlock"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
              <p className="text-muted-foreground">
                Enroll in a course and complete it to earn your first certificate.
              </p>
            </Card>
          )}

          <Card className="p-6 border-border/60 mt-8 bg-accent/20">
            <h3 className="font-semibold mb-2">Certificate Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Certificates are issued upon successful completion of module assessments</li>
              <li>• All certificates are digitally signed and verifiable</li>
              <li>• Share your certificates on LinkedIn and other professional networks</li>
              <li>• Certificates can be downloaded in PDF format</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
