import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChefHat, Clock, Loader2, Star, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";

const MySpecializations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  // Fetch chef's specialized recipes
  const { data: specializations, isLoading } = useQuery({
    queryKey: ["chef-specializations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("chef_specializations")
        .select(`
          id,
          recipe_id,
          recipes:recipe_id (
            id,
            title,
            description,
            difficulty,
            prep_time,
            cook_time,
            video_url,
            instructions,
            ingredients,
            courses:course_id (id, title)
          )
        `)
        .eq("chef_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch ingredient details for each recipe
  const { data: recipeIngredients } = useQuery({
    queryKey: ["recipe-ingredients-detail", specializations?.map(s => s.recipe_id)],
    queryFn: async () => {
      if (!specializations?.length) return {};
      
      const recipeIds = specializations.map(s => s.recipe_id).filter(Boolean);
      
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select(`
          id,
          recipe_id,
          quantity_per_student,
          notes,
          inventory:inventory_id (id, name, unit, category)
        `)
        .in("recipe_id", recipeIds);

      if (error) throw error;
      
      // Group by recipe_id
      const grouped: Record<string, typeof data> = {};
      data?.forEach(item => {
        if (!grouped[item.recipe_id]) {
          grouped[item.recipe_id] = [];
        }
        grouped[item.recipe_id].push(item);
      });
      
      return grouped;
    },
    enabled: !!specializations?.length,
  });

  const filteredSpecializations = specializations?.filter((spec) => {
    const recipe = spec.recipes as any;
    if (!recipe) return false;
    const matchesSearch =
      recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
        <Header role="chef" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              My Specializations
            </h1>
          </div>
          <p className="text-muted-foreground">
            Recipes you specialize in with detailed ingredient requirements
          </p>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your specialized recipes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{specializations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Specialized Recipes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(recipeIngredients || {}).flat().length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Ingredients</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Expert</p>
                <p className="text-sm text-muted-foreground">Your Status</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recipe Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpecializations?.map((spec) => {
            const recipe = spec.recipes as any;
            if (!recipe) return null;
            const ingredients = recipeIngredients?.[recipe.id] || [];
            
            return (
              <Card
                key={spec.id}
                className="overflow-hidden border-border/60 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                  <ChefHat className="h-16 w-16 text-primary/50" />
                  <Badge className="absolute top-3 right-3 bg-yellow-500">
                    <Star className="h-3 w-3 mr-1" />
                    Specialized
                  </Badge>
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
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {ingredients.length} ingredients
                    </Badge>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <Badge variant="outline">{recipe.courses?.title}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredSpecializations?.length === 0 && (
          <Card className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No specializations found</h3>
            <p className="text-muted-foreground">
              You don't have any assigned recipe specializations yet.
            </p>
          </Card>
        )}

        {/* Recipe Detail Dialog */}
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {selectedRecipe?.title}
                <Badge className="bg-yellow-500 ml-2">
                  <Star className="h-3 w-3 mr-1" />
                  Your Specialty
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Video */}
              {selectedRecipe?.video_url && (
                <VideoPlayer
                  videoUrl={selectedRecipe.video_url}
                  title={selectedRecipe.title}
                />
              )}

              {/* Info */}
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

              {/* Description */}
              {selectedRecipe?.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              {/* Detailed Ingredient Requirements */}
              {selectedRecipe && recipeIngredients?.[selectedRecipe.id]?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detailed Ingredient Requirements (Per Student)
                  </h4>
                  <Card className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity/Student</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipeIngredients[selectedRecipe.id].map((ing: any) => (
                          <TableRow key={ing.id}>
                            <TableCell className="font-medium">
                              {ing.inventory?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {ing.inventory?.category || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ing.quantity_per_student} {ing.inventory?.unit || ""}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ing.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {/* Legacy Ingredients from JSON */}
              {selectedRecipe?.ingredients && (
                <div>
                  <h4 className="font-semibold mb-2">Ingredients List</h4>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {Array.isArray(selectedRecipe.ingredients) ? (
                      selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                        <li key={index}>
                          {typeof ingredient === 'string' 
                            ? ingredient 
                            : `${ingredient.name}: ${ingredient.quantity}`}
                        </li>
                      ))
                    ) : (
                      <li>No ingredients listed</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Instructions */}
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

export default MySpecializations;
