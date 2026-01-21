import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Award, Lock, Loader2, Share2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CertificateEligibilityCard } from "@/components/student/CertificateEligibilityCard";

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

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

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

  // Check for pending payments
  const { data: paymentSchedules } = useQuery({
    queryKey: ["my-payment-schedules-cert"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("payment_schedules")
        .select("*")
        .eq("student_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const generatePDF = (cert: any) => {
    const studentName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Student";
    const courseTitle = cert.courses?.title || "Course";
    const issueDate = format(new Date(cert.issueDate), "MMMM d, yyyy");

    // Create PDF content using canvas
    const canvas = document.createElement("canvas");
    canvas.width = 1056;
    canvas.height = 816;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast({ title: "Error generating PDF", variant: "destructive" });
      return;
    }

    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fef9f3");
    gradient.addColorStop(1, "#fdf2e9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "#c4a574";
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Inner border
    ctx.strokeStyle = "#d4b896";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    // Title
    ctx.fillStyle = "#8b4513";
    ctx.font = "bold 56px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Certificate of Completion", canvas.width / 2, 150);

    // Decorative line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 200, 180);
    ctx.lineTo(canvas.width / 2 + 200, 180);
    ctx.strokeStyle = "#c4a574";
    ctx.lineWidth = 2;
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = "#5c4033";
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText("This is to certify that", canvas.width / 2, 260);

    // Student name
    ctx.fillStyle = "#2d1810";
    ctx.font = "bold 48px Georgia, serif";
    ctx.fillText(studentName, canvas.width / 2, 340);

    // "has successfully completed"
    ctx.fillStyle = "#5c4033";
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText("has successfully completed the course", canvas.width / 2, 410);

    // Course title
    ctx.fillStyle = "#8b4513";
    ctx.font = "bold 36px Georgia, serif";
    ctx.fillText(courseTitle, canvas.width / 2, 480);

    // Institution
    ctx.fillStyle = "#5c4033";
    ctx.font = "italic 22px Georgia, serif";
    ctx.fillText("at Knead & Frost Baking Academy", canvas.width / 2, 530);

    // Date
    ctx.fillStyle = "#5c4033";
    ctx.font = "20px Georgia, serif";
    ctx.fillText(`Issued on ${issueDate}`, canvas.width / 2, 610);

    // Certificate number
    ctx.fillStyle = "#8b7355";
    ctx.font = "16px Georgia, serif";
    ctx.fillText(`Certificate #: ${cert.certificateNumber}`, canvas.width / 2, 650);

    // Signature line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, 720);
    ctx.lineTo(canvas.width / 2 + 100, 720);
    ctx.strokeStyle = "#5c4033";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#5c4033";
    ctx.font = "16px Georgia, serif";
    ctx.fillText("Director, Knead & Frost Academy", canvas.width / 2, 750);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${courseTitle.replace(/\s+/g, "_")}_Certificate.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Certificate downloaded!" });
      }
    }, "image/png");
  };

  const handleShare = async (cert: any) => {
    const courseTitle = cert.courses?.title || "Course";
    const shareData = {
      title: `${courseTitle} Certificate`,
      text: `I just completed ${courseTitle} at Knead & Frost Baking Academy!`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `I just completed ${courseTitle} at Knead & Frost Baking Academy! ${window.location.origin}`
      );
      toast({ title: "Link copied to clipboard!" });
    }
  };

  // Check if enrollment has pending payments
  const hasPendingPayments = (enrollmentId: string) => {
    return paymentSchedules?.some(
      (p) => p.enrollment_id === enrollmentId && p.status !== "paid"
    ) ?? false;
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
      courses: cert.courses,
      paymentCompleted: true,
      attendanceCompleted: true,
      totalClasses: 0,
      attendedClasses: 0,
    })),
    ...(enrollments || [])
      .filter(enr => !certificates?.some(c => c.course_id === enr.course_id))
      .map(enr => {
        const paymentCompleted = (enr as any).payment_completed || !hasPendingPayments(enr.id);
        const attendanceCompleted = (enr as any).attendance_completed || false;
        return {
          id: enr.id,
          title: `${enr.courses?.title || "Course"} Certificate`,
          issueDate: null,
          status: (enr.progress || 0) > 0 ? "in-progress" : "locked" as const,
          progress: enr.progress || 0,
          certificateNumber: null,
          courses: enr.courses,
          paymentCompleted,
          attendanceCompleted,
          totalClasses: (enr as any).total_classes || 0,
          attendedClasses: (enr as any).attended_classes || 0,
        };
      }),
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
                              onClick={() => generatePDF(cert)}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Certificate
                            </Button>
                            <Button variant="outline" onClick={() => handleShare(cert)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Certificate Eligibility Card */}
                          <CertificateEligibilityCard
                            progress={cert.progress}
                            paymentCompleted={cert.paymentCompleted}
                            attendanceCompleted={cert.attendanceCompleted}
                            totalClasses={cert.totalClasses}
                            attendedClasses={cert.attendedClasses}
                          />
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
              <li>• Certificates can be downloaded as high-quality images</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
