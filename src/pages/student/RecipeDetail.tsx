import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useParams, Link } from "react-router-dom";
import { Clock, ChefHat, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RecipeDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Fetch recipe from database
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      if (!id) throw new Error("Recipe ID required");

      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's progress on this recipe
  const { data: progress } = useQuery({
    queryKey: ["recipe-progress", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from("student_recipe_progress")
        .select("*")
        .eq("student_id", user.id)
        .eq("recipe_id", id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!id,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) throw new Error("Not authenticated");

      // Upsert progress
      const { error } = await supabase
        .from("student_recipe_progress")
        .upsert({
          student_id: user.id,
          recipe_id: id,
          status: "completed",
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "student_id,recipe_id",
        });

      if (error) throw error;

      // Update enrollment progress
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id, course_id")
        .eq("student_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (enrollment) {
        const { data: totalRecipes } = await supabase
          .from("recipes")
          .select("id")
          .eq("course_id", enrollment.course_id);

        const { data: completedProgress } = await supabase
          .from("student_recipe_progress")
          .select("id, recipes!inner(course_id)")
          .eq("student_id", user.id)
          .eq("status", "completed");

        const completedInCourse = completedProgress?.filter(
          (p: any) => p.recipes?.course_id === enrollment.course_id
        ).length || 0;

        const newProgress = Math.round((completedInCourse / (totalRecipes?.length || 1)) * 100);

        await supabase
          .from("enrollments")
          .update({ progress: newProgress })
          .eq("id", enrollment.id);
      }
    },
    onSuccess: () => {
      toast({ title: "Recipe marked as complete!" });
      queryClient.invalidateQueries({ queryKey: ["recipe-progress", id] });
      queryClient.invalidateQueries({ queryKey: ["course-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollment"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="container px-6 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
            <Button asChild>
              <Link to="/student/my-course">Back to Course</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = progress?.status === "completed";
  const ingredients = (recipe.ingredients as any[]) || [];
  const instructions = recipe.instructions?.split("\n").filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/student/my-course">
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Link>
          </Button>

          <div className="mb-8">
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>
              {isCompleted && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {recipe.prep_time && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Prep: {recipe.prep_time} mins
                </Badge>
              )}
              {recipe.cook_time && (
                <Badge variant="secondary">
                  <ChefHat className="h-3 w-3 mr-1" />
                  Cook: {recipe.cook_time} mins
                </Badge>
              )}
              {recipe.difficulty && <Badge>{recipe.difficulty}</Badge>}
            </div>
          </div>

          {recipe.description && (
            <Card className="p-6 border-border/60 mb-6">
              <h2 className="text-xl font-semibold mb-3">About This Recipe</h2>
              <p className="text-muted-foreground leading-relaxed">{recipe.description}</p>
            </Card>
          )}

          {ingredients.length > 0 && (
            <Card className="p-6 border-border/60 mb-6">
              <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
              <div className="space-y-2">
                {ingredients.map((ingredient: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span>{typeof ingredient === 'string' ? ingredient : ingredient.name}</span>
                    {typeof ingredient === 'object' && ingredient.amount && (
                      <span className="font-medium text-primary">{ingredient.amount}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {instructions.length > 0 && (
            <Card className="p-6 border-border/60 mb-6">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ol className="space-y-4">
                {instructions.map((step: string, index: number) => (
                  <li key={index} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <p className="flex-1 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div className="flex gap-4">
            {!isCompleted && (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
              >
                {markCompleteMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><CheckCircle className="h-5 w-5 mr-2" />Mark as Complete</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
