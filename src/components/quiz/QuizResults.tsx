import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trophy, ArrowLeft } from "lucide-react";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  passingScore: number;
  onBack: () => void;
}

export const QuizResults = ({
  score,
  totalQuestions,
  correctAnswers,
  passed,
  passingScore,
  onBack,
}: QuizResultsProps) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 text-center">
        {passed ? (
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Congratulations!
            </h2>
            <p className="text-muted-foreground">
              You have successfully passed this assessment
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">
              Keep Practicing!
            </h2>
            <p className="text-muted-foreground">
              You need {passingScore}% to pass. Review the material and try again.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold">{score}%</p>
            <p className="text-sm text-muted-foreground">Your Score</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold">{correctAnswers}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold">{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-lg mb-6 ${
            passed
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {passed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-medium ${
                passed ? "text-green-700" : "text-red-700"
              }`}
            >
              {passed
                ? `You passed! (Required: ${passingScore}%)`
                : `You need ${passingScore}% to pass`}
            </span>
          </div>
        </div>

        <Button onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
      </Card>
    </div>
  );
};
