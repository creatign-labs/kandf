import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Lock, Award } from "lucide-react";

interface CertificateEligibilityProps {
  progress: number;
  paymentCompleted: boolean;
  attendanceCompleted: boolean;
  totalClasses: number;
  attendedClasses: number;
}

export const CertificateEligibilityCard = ({
  progress,
  paymentCompleted,
  attendanceCompleted,
  totalClasses,
  attendedClasses,
}: CertificateEligibilityProps) => {
  const allConditionsMet = progress >= 100 && paymentCompleted && attendanceCompleted;

  const conditions = [
    {
      label: "Course Progress",
      description: `${progress}% completed`,
      met: progress >= 100,
    },
    {
      label: "Full Payment",
      description: paymentCompleted ? "All payments completed" : "Pending payments",
      met: paymentCompleted,
    },
    {
      label: "Attendance",
      description: `${attendedClasses}/${totalClasses} classes attended`,
      met: attendanceCompleted,
    },
  ];

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-2 mb-4">
        {allConditionsMet ? (
          <Award className="h-5 w-5 text-primary" />
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}
        <h4 className="font-semibold">Certificate Eligibility</h4>
        {allConditionsMet ? (
          <Badge className="bg-green-500 text-white ml-auto">Eligible</Badge>
        ) : (
          <Badge variant="outline" className="ml-auto">Not Yet Eligible</Badge>
        )}
      </div>

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="flex items-center gap-3"
          >
            {condition.met ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${condition.met ? "text-foreground" : "text-muted-foreground"}`}>
                {condition.label}
              </p>
              <p className="text-xs text-muted-foreground">{condition.description}</p>
            </div>
          </div>
        ))}
      </div>

      {!allConditionsMet && (
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          Complete all requirements above to unlock your certificate
        </p>
      )}
    </Card>
  );
};
