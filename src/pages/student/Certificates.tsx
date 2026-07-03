import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

const Certificates = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />

      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
            <p className="text-muted-foreground">
              Course completion certificates
            </p>
          </div>

          <Card className="p-8 text-center border-border/60">
            <Award className="h-12 w-12 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Certificate of Completion</h3>
            <p className="text-muted-foreground">
              Please contact admin for your course completion certificate.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
