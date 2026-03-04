import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MonitorPlay, Lock, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useState } from "react";

const OnlineClasses = () => {
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  // Check online access
  const { data: onlineAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["my-online-access"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from("student_online_access")
        .select("*")
        .eq("student_id", user.id)
        .eq("is_enabled", true)
        .maybeSingle();
      return data;
    },
  });

  // Fetch enabled recipes with video details
  const { data: enabledRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["my-online-recipes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: onlineRecipes } = await supabase
        .from("student_online_recipes")
        .select("recipe_id")
        .eq("student_id", user.id);

      if (!onlineRecipes || onlineRecipes.length === 0) return [];

      const recipeIds = onlineRecipes.map((r) => r.recipe_id);
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, title, description, video_url, difficulty, prep_time, cook_time, course_id, courses(title)")
        .in("id", recipeIds)
        .order("created_at");

      return recipes || [];
    },
    enabled: !!onlineAccess,
  });

  const isLoading = accessLoading || recipesLoading;
  const activeRecipe = enabledRecipes?.find((r) => r.id === activeRecipeId);

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

  if (!onlineAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="container px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 text-center border-border/60">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Online Classes Not Enabled</h2>
              <p className="text-muted-foreground">
                Online class access has not been enabled for your account. Please contact your admin to get access.
              </p>
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
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <MonitorPlay className="h-7 w-7" />
              Online Classes
            </h1>
            <p className="text-muted-foreground">
              Watch pre-recorded recipe videos enabled by your instructor
            </p>
          </div>

          {/* Active Video Player */}
          {activeRecipe && (
            <Card className="mb-6 overflow-hidden border-border/60">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{activeRecipe.title}</h2>
                    {activeRecipe.difficulty && (
                      <span className="text-sm text-muted-foreground">({activeRecipe.difficulty})</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveRecipeId(null)}>
                    Close
                  </Button>
                </div>
              </div>
              {activeRecipe.video_url ? (
                <VideoPlayer videoUrl={activeRecipe.video_url} title={activeRecipe.title} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No video available for this recipe yet.</p>
                </div>
              )}
              {activeRecipe.description && (
                <div className="p-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">{activeRecipe.description}</p>
                </div>
              )}
            </Card>
          )}

          {/* Recipe List */}
          <Card className="p-6 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Available Recipes</h3>
                <p className="text-sm text-muted-foreground">
                  {enabledRecipes?.length || 0} recipe(s) available for online viewing
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {enabledRecipes?.map((recipe, index) => {
                const isActive = activeRecipeId === recipe.id;
                const hasVideo = !!recipe.video_url;
                return (
                  <div
                    key={recipe.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/30"
                    }`}
                    onClick={() => setActiveRecipeId(isActive ? null : recipe.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">{recipe.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {recipe.difficulty && (
                            <span className="text-xs text-muted-foreground">
                              {recipe.difficulty}
                            </span>
                          )}
                          {recipe.prep_time && (
                            <span className="text-xs text-muted-foreground">
                              • Prep: {recipe.prep_time}min
                            </span>
                          )}
                          {recipe.cook_time && (
                            <span className="text-xs text-muted-foreground">
                              • Cook: {recipe.cook_time}min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasVideo ? (
                        <Badge
                          variant={isActive ? "default" : "outline"}
                          className={!isActive ? "text-green-600 border-green-300" : ""}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {isActive ? "Now Playing" : "Watch"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No Video
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!enabledRecipes || enabledRecipes.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No recipes have been enabled for online viewing yet. Contact your admin.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OnlineClasses;
