import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Video, Loader2, MonitorPlay } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OnlineClassManagerProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OnlineClassManager = ({
  studentId,
  studentName,
  open,
  onOpenChange,
}: OnlineClassManagerProps) => {
  const queryClient = useQueryClient();

  // Fetch online access status
  const { data: onlineAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["online-access", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_online_access")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Fetch student's enrollment to get course_id
  const { data: enrollment } = useQuery({
    queryKey: ["student-enrollment-for-online", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, courses(id, title)")
        .eq("student_id", studentId)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Fetch recipes for the course
  const { data: recipes } = useQuery({
    queryKey: ["course-recipes-online", enrollment?.course_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id, title, video_url, difficulty")
        .eq("course_id", enrollment!.course_id)
        .order("created_at");
      return data || [];
    },
    enabled: !!enrollment?.course_id && open,
  });

  // Fetch enabled recipes for this student
  const { data: enabledRecipes } = useQuery({
    queryKey: ["online-recipes", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_online_recipes")
        .select("recipe_id")
        .eq("student_id", studentId);
      return data?.map((r) => r.recipe_id) || [];
    },
    enabled: open,
  });

  const isEnabled = onlineAccess?.is_enabled || false;

  // Toggle online access
  const toggleAccessMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (onlineAccess) {
        const { error } = await supabase
          .from("student_online_access")
          .update({
            is_enabled: enabled,
            enabled_by: enabled ? user.id : null,
            enabled_at: enabled ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("student_id", studentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_online_access")
          .insert({
            student_id: studentId,
            is_enabled: enabled,
            enabled_by: enabled ? user.id : null,
            enabled_at: enabled ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["online-access", studentId] });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast({
        title: enabled ? "Online Classes Enabled" : "Online Classes Disabled",
        description: `Online class access ${enabled ? "enabled" : "disabled"} for ${studentName}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle individual recipe
  const toggleRecipeMutation = useMutation({
    mutationFn: async ({ recipeId, enabled }: { recipeId: string; enabled: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (enabled) {
        const { error } = await supabase
          .from("student_online_recipes")
          .insert({
            student_id: studentId,
            recipe_id: recipeId,
            enabled_by: user.id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_online_recipes")
          .delete()
          .eq("student_id", studentId)
          .eq("recipe_id", recipeId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online-recipes", studentId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Enable/disable all recipes
  const toggleAllRecipesMutation = useMutation({
    mutationFn: async (enableAll: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (enableAll && recipes) {
        // Delete existing then insert all
        await supabase
          .from("student_online_recipes")
          .delete()
          .eq("student_id", studentId);

        const inserts = recipes.map((r) => ({
          student_id: studentId,
          recipe_id: r.id,
          enabled_by: user.id,
        }));
        const { error } = await supabase.from("student_online_recipes").insert(inserts);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_online_recipes")
          .delete()
          .eq("student_id", studentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online-recipes", studentId] });
      toast({ title: "Updated", description: "Recipe access updated" });
    },
  });

  const enabledCount = enabledRecipes?.length || 0;
  const totalRecipes = recipes?.length || 0;
  const allEnabled = totalRecipes > 0 && enabledCount === totalRecipes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorPlay className="h-5 w-5" />
            Online Classes — {studentName}
          </DialogTitle>
          <DialogDescription>
            Enable online class access and select which recipe videos the student can view.
          </DialogDescription>
        </DialogHeader>

        {accessLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Master Toggle */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Online Class Access</p>
                  <p className="text-sm text-muted-foreground">
                    {isEnabled ? "Student can view enabled recipe videos" : "Online classes are disabled for this student"}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleAccessMutation.mutate(checked)}
                  disabled={toggleAccessMutation.isPending}
                />
              </div>
            </Card>

            {/* Recipe Selection */}
            {isEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Enabled Recipes</h4>
                    <p className="text-xs text-muted-foreground">
                      {enabledCount} of {totalRecipes} recipes enabled
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllRecipesMutation.mutate(!allEnabled)}
                    disabled={toggleAllRecipesMutation.isPending}
                  >
                    {allEnabled ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {!enrollment?.course_id ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active course enrollment found for this student.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recipes?.map((recipe, index) => {
                      const isRecipeEnabled = enabledRecipes?.includes(recipe.id) || false;
                      const hasVideo = !!recipe.video_url;
                      return (
                        <div
                          key={recipe.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                        >
                          <Checkbox
                            checked={isRecipeEnabled}
                            onCheckedChange={(checked) =>
                              toggleRecipeMutation.mutate({ recipeId: recipe.id, enabled: !!checked })
                            }
                            disabled={toggleRecipeMutation.isPending}
                          />
                          <span className="text-sm font-mono text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recipe.title}</p>
                            {recipe.difficulty && (
                              <span className="text-xs text-muted-foreground">({recipe.difficulty})</span>
                            )}
                          </div>
                          {hasVideo ? (
                            <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              No Video
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {(!recipes || recipes.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recipes found for this course.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
