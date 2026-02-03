import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, Loader2, Calendar, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecipeSlotBooking } from "@/components/student/RecipeSlotBooking";

const MyCourse = () => {
  const [bookingRecipeId, setBookingRecipeId] = useState<string | null>(null);

  // Fetch user's active enrollment with course
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['my-enrollment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
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

      // Fetch existing bookings for this student
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

  const isLoading = enrollmentLoading || recipesLoading;

  // Calculate progress
  const completedCount = recipesData?.progress?.filter(p => p.status === 'completed').length || 0;
  const totalCount = recipesData?.recipes?.length || 0;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get recipe status
  const getRecipeStatus = (recipeId: string, index: number) => {
    const progressItem = recipesData?.progress?.find(p => p.recipe_id === recipeId);
    if (progressItem?.status === 'completed') return 'completed';
    // All recipes are now accessible (flat list)
    return 'available';
  };

  // Check if recipe has an existing booking
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
      
      <div className="container px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{enrollment.courses?.title}</h1>
            <p className="text-muted-foreground">{enrollment.courses?.description}</p>
          </div>

          <Card className="p-6 border-border/60 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overall Progress</h2>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} recipes completed • Keep up the great work!
            </p>
          </Card>

          {/* Flat Recipe List with Inline Booking */}
          <Card className="p-6 border-border/60">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold">Course Recipes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  View recipes and book practice slots directly
                </p>
              </div>
              <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                {overallProgress === 100 ? "Completed" : `${completedCount}/${totalCount}`}
              </Badge>
            </div>

            <div className="space-y-4">
              {recipesData?.recipes?.map((recipe, index) => {
                const status = getRecipeStatus(recipe.id, index);
                const existingBooking = getRecipeBooking(recipe.id);
                const isCompleted = status === 'completed';
                const isBookingOpen = bookingRecipeId === recipe.id;
                
                return (
                  <div key={recipe.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Recipe Row */}
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
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
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({recipe.difficulty})
                            </span>
                          )}
                          {existingBooking && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              Booked: {existingBooking.booking_date} at {existingBooking.time_slot}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isCompleted && !existingBooking && (
                          <Button
                            variant={isBookingOpen ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setBookingRecipeId(isBookingOpen ? null : recipe.id)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            {isBookingOpen ? "Close" : "Book Slot"}
                          </Button>
                        )}
                        {isCompleted && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Inline Booking Panel */}
                    {isBookingOpen && enrollment.course_id && (
                      <div className="border-t border-border bg-muted/30 p-4">
                        <RecipeSlotBooking 
                          courseId={enrollment.course_id}
                          recipeId={recipe.id}
                          recipeTitle={recipe.title}
                          onBooked={() => setBookingRecipeId(null)}
                        />
                      </div>
                    )}
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