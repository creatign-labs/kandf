import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Clock, CheckCircle, Lock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { QuizEngine } from "@/components/quiz/QuizEngine";

interface ActiveQuiz {
  studentAssessmentId: string;
  assessmentId: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
}

const Assessments = () => {
  const queryClient = useQueryClient();
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);

  // Fetch user's active enrollment
  const { data: enrollment } = useQuery({
    queryKey: ['my-enrollment-assessment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch assessments for the course
  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['course-assessments', enrollment?.course_id],
    queryFn: async () => {
      if (!enrollment?.course_id) return { assessments: [], studentAssessments: [] };
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', enrollment.course_id)
        .order('created_at');
      
      if (assessmentsError) throw assessmentsError;

      const { data: studentAssessments, error: studentError } = await supabase
        .from('student_assessments')
        .select('*')
        .eq('student_id', user.id);
      
      if (studentError) throw studentError;

      return { assessments: assessments || [], studentAssessments: studentAssessments || [] };
    },
    enabled: !!enrollment?.course_id
  });

  const startAssessmentMutation = useMutation({
    mutationFn: async (assessment: { id: string; title: string; duration_minutes: number; passing_score: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('student_assessments')
        .insert({
          student_id: user.id,
          assessment_id: assessment.id,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { studentAssessmentId: data.id, assessment };
    },
    onSuccess: (result) => {
      setActiveQuiz({
        studentAssessmentId: result.studentAssessmentId,
        assessmentId: result.assessment.id,
        title: result.assessment.title,
        durationMinutes: result.assessment.duration_minutes,
        passingScore: result.assessment.passing_score
      });
      queryClient.invalidateQueries({ queryKey: ['course-assessments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleContinueAssessment = (assessment: { id: string; title: string; duration_minutes: number; passing_score: number }, studentAssessmentId: string) => {
    setActiveQuiz({
      studentAssessmentId,
      assessmentId: assessment.id,
      title: assessment.title,
      durationMinutes: assessment.duration_minutes,
      passingScore: assessment.passing_score
    });
  };

  const getAssessmentStatus = (assessmentId: string, index: number) => {
    const studentAssessment = assessmentsData?.studentAssessments?.find(
      sa => sa.assessment_id === assessmentId
    );
    
    if (studentAssessment?.status === 'completed') return 'completed';
    if (studentAssessment?.status === 'in_progress') return 'in_progress';
    
    // First assessment is always available
    if (index === 0) return 'available';
    
    // Check if previous assessment is completed
    const prevAssessment = assessmentsData?.assessments?.[index - 1];
    if (prevAssessment) {
      const prevStudentAssessment = assessmentsData?.studentAssessments?.find(
        sa => sa.assessment_id === prevAssessment.id
      );
      if (prevStudentAssessment?.status === 'completed') return 'available';
    }
    
    return 'locked';
  };

  const completedCount = assessmentsData?.studentAssessments?.filter(sa => sa.status === 'completed').length || 0;
  const totalCount = assessmentsData?.assessments?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show quiz engine if there's an active quiz
  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="container px-6 py-8">
          <QuizEngine
            studentAssessmentId={activeQuiz.studentAssessmentId}
            assessmentId={activeQuiz.assessmentId}
            assessmentTitle={activeQuiz.title}
            durationMinutes={activeQuiz.durationMinutes}
            passingScore={activeQuiz.passingScore}
            onComplete={() => {
              setActiveQuiz(null);
              queryClient.invalidateQueries({ queryKey: ['course-assessments'] });
            }}
            onBack={() => setActiveQuiz(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Assessments</h1>
            <p className="text-muted-foreground">Test your knowledge and track your progress</p>
          </div>

          <Card className="p-6 border-border/60 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Course Completion</span>
                <span className="font-semibold">{enrollment?.progress || 0}%</span>
              </div>
              <Progress value={enrollment?.progress || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} assessments completed • Keep learning to unlock more!
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            {assessmentsData?.assessments?.map((assessment, index) => {
              const status = getAssessmentStatus(assessment.id, index);
              const studentAssessment = assessmentsData.studentAssessments?.find(
                sa => sa.assessment_id === assessment.id
              );

              return (
                <Card key={assessment.id} className="p-6 border-border/60">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        {enrollment?.courses?.title}
                      </p>
                      <h3 className="text-xl font-semibold mb-2">{assessment.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {assessment.questions_count} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {assessment.duration_minutes} mins
                        </span>
                      </div>
                    </div>
                    <div>
                      {status === "completed" && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {status === "in_progress" && (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                      {status === "available" && (
                        <Badge variant="secondary">Available</Badge>
                      )}
                      {status === "locked" && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {status === "completed" && studentAssessment && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Your Score: {studentAssessment.score}%
                          </p>
                          <p className="text-xs text-green-700">
                            Completed on {studentAssessment.completed_at ? new Date(studentAssessment.completed_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  )}

                  {status === "available" && (
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => startAssessmentMutation.mutate({
                        id: assessment.id,
                        title: assessment.title,
                        duration_minutes: assessment.duration_minutes,
                        passing_score: assessment.passing_score
                      })}
                      disabled={startAssessmentMutation.isPending}
                    >
                      {startAssessmentMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting...</>
                      ) : (
                        'Start Assessment'
                      )}
                    </Button>
                  )}

                  {status === "in_progress" && studentAssessment && (
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleContinueAssessment(
                        {
                          id: assessment.id,
                          title: assessment.title,
                          duration_minutes: assessment.duration_minutes,
                          passing_score: assessment.passing_score
                        },
                        studentAssessment.id
                      )}
                    >
                      Continue Assessment
                    </Button>
                  )}

                  {status === "locked" && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">
                        Complete previous assessments to unlock this one
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}

            {(!assessmentsData?.assessments || assessmentsData.assessments.length === 0) && (
              <Card className="p-8 text-center border-border/60">
                <p className="text-muted-foreground">No assessments available for this course yet.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessments;
