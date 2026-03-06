import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, Loader2, CalendarCheck, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, parseISO } from "date-fns";

const MyCourse = () => {

  // Fetch user's enrollment with course
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['my-enrollment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*), batches(start_date)')
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipes for the course with progress
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['course-recipes', enrollment?.course_id],
    queryFn: async () => {
      if (!enrollment?.course_id) return { recipes: [], progress: [], bookings: [] };
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('course_id', enrollment.course_id)
        .order('created_at');
      
      if (recipesError) throw recipesError;

      const { data: progress, error: progressError } = await supabase
        .from('student_recipe_progress')
        .select('*')
        .eq('student_id', user.id);
      
      if (progressError) throw progressError;

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('recipe_id, booking_date, time_slot, status')
        .eq('student_id', user.id)
        .eq('course_id', enrollment.course_id)
        .in('status', ['confirmed', 'pending']);

      if (bookingsError) throw bookingsError;

      return { recipes: recipes || [], progress: progress || [], bookings: bookings || [] };
    },
    enabled: !!enrollment?.course_id
  });

  // Fetch profile for status check
  const { data: profile } = useQuery({
    queryKey: ['my-profile-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('enrollment_status').eq('id', user.id).single();
      return data;
    }
  });

  const isLoading = enrollmentLoading || recipesLoading;

  // Calculate progress
  const completedCount = recipesData?.progress?.filter(p => p.status === 'completed').length || 0;
  const totalCount = recipesData?.recipes?.length || 0;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isActive = profile?.enrollment_status === 'active';

  // Compute enrollment dates
  const enrollmentDate = enrollment?.enrollment_date ? format(parseISO(enrollment.enrollment_date), 'MMM d, yyyy') : 'N/A';
  const courseStartDate = enrollment?.batches?.start_date ? format(parseISO(enrollment.batches.start_date), 'MMM d, yyyy') : enrollmentDate;
  
  // Parse duration for end date
  const durationMonths = enrollment?.courses?.duration 
    ? parseInt(enrollment.courses.duration.match(/(\d+)/)?.[1] || '3') 
    : 3;
  const courseEndDate = enrollment?.enrollment_date 
    ? format(addMonths(parseISO(enrollment.enrollment_date), durationMonths), 'MMM d, yyyy') 
    : 'N/A';

  // Get recipe status - completion derived from student_recipe_progress (set via attendance)
  const getRecipeStatus = (recipeId: string) => {
    const progressItem = recipesData?.progress?.find(p => p.recipe_id === recipeId);
    if (progressItem?.status === 'completed') return 'completed';
    return 'available';
  };

  const getCompletionDate = (recipeId: string) => {
    const progressItem = recipesData?.progress?.find(p => p.recipe_id === recipeId && p.status === 'completed');
    return progressItem?.completed_at ? format(parseISO(progressItem.completed_at), 'MMM d, yyyy') : null;
  };

  const getRecipeBooking = (recipeId: string) => {
    return recipesData?.bookings?.find(b => b.recipe_id === recipeId);
  };

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

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="container px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <Card className="p-8 text-center border-border/60">
              <h2 className="text-xl font-semibold mb-2">No Active Course</h2>
              <p className="text-muted-foreground mb-4">You haven't enrolled in any course yet.</p>
              <Button asChild>
                <Link to="/courses">Browse Courses</Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{enrollment.courses?.title}</h1>
            <p className="text-muted-foreground">{enrollment.courses?.description}</p>
          </div>

          {/* Enrollment Info */}
          <Card className="p-5 border-border/60 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Enrollment Date</p>
                <p className="font-medium">{enrollmentDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Course Start</p>
                <p className="font-medium">{courseStartDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Course End</p>
                <p className="font-medium">{courseEndDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">{enrollment.courses?.duration}</p>
              </div>
            </div>
          </Card>

          {/* Progress */}
          <Card className="p-6 border-border/60 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overall Progress</h2>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} recipes completed
              {overallProgress === 100 && ' — Course Complete! 🎉'}
            </p>
          </Card>

          {/* Completion Note */}
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-muted/50 border border-border/60">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Recipe completion is determined by your attendance records. When you attend a session and the chef marks it complete, it will be reflected here automatically.
            </p>
          </div>

          {/* Recipe List */}
          <Card className="p-6 border-border/60">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold">Course Recipes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ordered recipe list with booking options
                </p>
              </div>
              <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                {overallProgress === 100 ? "Completed" : `${completedCount}/${totalCount}`}
              </Badge>
            </div>

            <div className="space-y-3">
              {recipesData?.recipes?.map((recipe, index) => {
                const status = getRecipeStatus(recipe.id);
                const completionDate = getCompletionDate(recipe.id);
                const existingBooking = getRecipeBooking(recipe.id);
                const isCompleted = status === 'completed';
                
                
                return (
                  <div key={recipe.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground w-6">{index + 1}.</span>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : existingBooking ? (
                          <CalendarCheck className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <span className="font-medium">{recipe.title}</span>
                          {recipe.difficulty && (
                            <span className="ml-2 text-xs text-muted-foreground">({recipe.difficulty})</span>
                          )}
                          {isCompleted && completionDate && (
                            <p className="text-xs text-green-600 mt-0.5">Completed: {completionDate}</p>
                          )}
                          {existingBooking && !isCompleted && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              Booked: {existingBooking.booking_date} at {existingBooking.time_slot}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <Badge variant="outline" className="text-green-600 border-green-600">Done</Badge>
                        )}
                      </div>
                    </div>
                    
                  </div>
                );
              })}
              {(!recipesData?.recipes || recipesData.recipes.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No recipes available for this course yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyCourse;
