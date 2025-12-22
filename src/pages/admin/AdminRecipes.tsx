import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChefHat, Clock, Loader2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Link } from "react-router-dom";

const AdminRecipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Fetch all recipes with course info
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, courses(id, title), modules(id, title)")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  // Fetch courses for filter
  const { data: courses } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  // Fetch recipe ingredient counts
  const { data: ingredientCounts } = useQuery({
    queryKey: ["recipe-ingredient-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((ri) => {
        counts[ri.recipe_id] = (counts[ri.recipe_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredRecipes = recipes?.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse =
      courseFilter === "all" || recipe.course_id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Recipe Library</h1>
            <p className="text-muted-foreground">Manage all recipes and their ingredients</p>
          </div>
          <Button asChild>
            <Link to="/admin/recipe-ingredients">
              <Package className="h-4 w-4 mr-2" />
              Manage Ingredients
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Recipe Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes?.map((recipe) => (
            <Card
              key={recipe.id}
              className="overflow-hidden border-border/60 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-primary/50" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{recipe.title}</h3>
                  {recipe.difficulty && (
                    <Badge className={getDifficultyColor(recipe.difficulty)}>
                      {recipe.difficulty}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {recipe.description || "No description available"}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {recipe.prep_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prep: {recipe.prep_time}m
                    </span>
                  )}
                  {recipe.cook_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Cook: {recipe.cook_time}m
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <Badge variant="outline">{recipe.courses?.title}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    {ingredientCounts?.[recipe.id] || 0} linked
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredRecipes?.length === 0 && (
          <Card className="p-8 text-center">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </Card>
        )}

        {/* Recipe Detail Dialog */}
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {selectedRecipe?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {selectedRecipe?.video_url && (
                <VideoPlayer videoUrl={selectedRecipe.video_url} title={selectedRecipe.title} />
              )}

              <div className="flex flex-wrap gap-3">
                {selectedRecipe?.difficulty && (
                  <Badge className={getDifficultyColor(selectedRecipe.difficulty)}>
                    {selectedRecipe.difficulty}
                  </Badge>
                )}
                {selectedRecipe?.prep_time && (
                  <Badge variant="outline">Prep: {selectedRecipe.prep_time} min</Badge>
                )}
                {selectedRecipe?.cook_time && (
                  <Badge variant="outline">Cook: {selectedRecipe.cook_time} min</Badge>
                )}
              </div>

              {selectedRecipe?.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              {selectedRecipe?.ingredients && (
                <div>
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {(selectedRecipe.ingredients as string[]).map((ingredient: string, index: number) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe?.instructions && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <div className="prose prose-sm text-muted-foreground whitespace-pre-line">
                    {selectedRecipe.instructions}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminRecipes;
