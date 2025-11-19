import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Award, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const certificates = [
  {
    id: 1,
    title: "Foundation Baking Certificate",
    module: "Course A - Module 1",
    issueDate: "January 15, 2025",
    status: "available",
    progress: 100,
  },
  {
    id: 2,
    title: "Pastry Techniques Certificate",
    module: "Course A - Module 2",
    issueDate: null,
    status: "in-progress",
    progress: 60,
  },
  {
    id: 3,
    title: "Professional Baking Diploma",
    module: "Complete Course A",
    issueDate: null,
    status: "locked",
    progress: 53,
  },
];

const Certificates = () => {
  const handleDownload = (title: string) => {
    toast({
      title: "Downloading certificate...",
      description: `${title} will be downloaded shortly.`,
    });
  };

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

          <div className="space-y-6">
            {certificates.map((cert) => (
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
                        <p className="text-sm text-muted-foreground">{cert.module}</p>
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
                            Certificate Issued: {cert.issueDate}
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
