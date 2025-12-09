import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { QuizResults } from "./QuizResults";

interface QuizEngineProps {
  studentAssessmentId: string;
  assessmentId: string;
  assessmentTitle: string;
  durationMinutes: number;
  passingScore: number;
  onComplete: () => void;
  onBack: () => void;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
}

export const QuizEngine = ({
  studentAssessmentId,
  assessmentId,
  assessmentTitle,
  durationMinutes,
  passingScore,
  onComplete,
  onBack,
}: QuizEngineProps) => {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
  } | null>(null);

  // Fetch questions for this assessment
  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, order_index")
        .eq("assessment_id", assessmentId)
        .order("order_index");

      if (error) throw error;
      return (data as Question[]) || [];
    },
  });

  // Fetch existing answers
  const { data: existingAnswers } = useQuery({
    queryKey: ["quiz-answers", studentAssessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_answers")
        .select("question_id, selected_answer")
        .eq("student_assessment_id", studentAssessmentId);

      if (error) throw error;
      return data || [];
    },
  });

  // Load existing answers into state
  useEffect(() => {
    if (existingAnswers && existingAnswers.length > 0) {
      const answerMap: Record<string, string> = {};
      existingAnswers.forEach((a) => {
        if (a.selected_answer) {
          answerMap[a.question_id] = a.selected_answer;
        }
      });
      setAnswers(answerMap);
    }
  }, [existingAnswers]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const saveAnswerMutation = useMutation({
    mutationFn: async ({
      questionId,
      answer,
    }: {
      questionId: string;
      answer: string;
    }) => {
      const { error } = await supabase.from("student_answers").upsert(
        {
          student_assessment_id: studentAssessmentId,
          question_id: questionId,
          selected_answer: answer,
          answered_at: new Date().toISOString(),
        },
        {
          onConflict: "student_assessment_id,question_id",
        }
      );

      if (error) throw error;
    },
  });

  const handleAnswerChange = useCallback(
    (questionId: string, answer: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
      saveAnswerMutation.mutate({ questionId, answer });
    },
    [saveAnswerMutation]
  );

  const handleSubmitQuiz = async () => {
    if (isSubmitting || !questions) return;
    setIsSubmitting(true);

    try {
      // Fetch correct answers and calculate score
      const { data: questionsWithAnswers, error: fetchError } = await supabase
        .from("questions")
        .select("id, correct_answer, points")
        .eq("assessment_id", assessmentId);

      if (fetchError) throw fetchError;

      let totalPoints = 0;
      let earnedPoints = 0;

      // Update each answer with is_correct status
      for (const q of questionsWithAnswers || []) {
        totalPoints += q.points;
        const studentAnswer = answers[q.id];
        const isCorrect = studentAnswer === q.correct_answer;

        if (isCorrect) {
          earnedPoints += q.points;
        }

        if (studentAnswer) {
          await supabase
            .from("student_answers")
            .update({ is_correct: isCorrect })
            .eq("student_assessment_id", studentAssessmentId)
            .eq("question_id", q.id);
        }
      }

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= passingScore;

      // Update student_assessment with final score
      const { error: updateError } = await supabase
        .from("student_assessments")
        .update({
          status: "completed",
          score: score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", studentAssessmentId);

      if (updateError) throw updateError;

      // Update enrollment progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id, progress, course_id")
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (enrollment) {
          // Calculate new progress based on completed assessments
          const { data: allAssessments } = await supabase
            .from("assessments")
            .select("id")
            .eq("course_id", enrollment.course_id);

          const { data: completedAssessments } = await supabase
            .from("student_assessments")
            .select("id")
            .eq("student_id", user.id)
            .eq("status", "completed");

          const totalAssessments = allAssessments?.length || 1;
          const completed = completedAssessments?.length || 0;
          const newProgress = Math.round((completed / totalAssessments) * 100);

          await supabase
            .from("enrollments")
            .update({ progress: newProgress })
            .eq("id", enrollment.id);
        }
      }

      setQuizResults({
        score,
        totalQuestions: questions.length,
        correctAnswers: earnedPoints,
        passed,
      });
      setShowResults(true);

      queryClient.invalidateQueries({ queryKey: ["course-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollment"] });

    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
        <p className="text-muted-foreground mb-4">
          This assessment doesn't have any questions yet.
        </p>
        <Button onClick={onBack}>Go Back</Button>
      </Card>
    );
  }

  if (showResults && quizResults) {
    return (
      <QuizResults
        score={quizResults.score}
        totalQuestions={quizResults.totalQuestions}
        correctAnswers={quizResults.correctAnswers}
        passed={quizResults.passed}
        passingScore={passingScore}
        onBack={onComplete}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const isTimeWarning = timeRemaining < 60;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{assessmentTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isTimeWarning ? "bg-destructive/10 text-destructive" : "bg-muted"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="font-mono font-semibold">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {answeredCount} of {questions.length} questions answered
        </p>
      </div>

      {/* Question Card */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-medium mb-6">{currentQuestion.question_text}</h3>

        <RadioGroup
          value={answers[currentQuestion.id] || ""}
          onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          className="space-y-3"
        >
          {(currentQuestion.options as string[]).map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                answers[currentQuestion.id] === option
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label
                htmlFor={`option-${index}`}
                className="flex-1 cursor-pointer font-normal"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrentQuestionIndex((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Quiz"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card className="p-4 mt-6">
        <p className="text-sm font-medium mb-3">Question Navigator</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
