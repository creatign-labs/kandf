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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChefHat, Clock, Loader2, Package, BookOpen, Utensils } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Link } from "react-router-dom";

const RecipeInventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Fetch all recipes with course info and linked ingredients count
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipe-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          course_recipes(courses(id, title)),
          modules(id, title),
          recipe_ingredients(
            id,
            quantity_per_student,
            notes,
            inventory(id, name, category, unit, current_stock)
          )
        `)
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

  const filteredRecipes = recipes?.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const linkedCourseIds = ((recipe as any).course_recipes || [])
      .map((cr: any) => cr.courses?.id)
      .filter(Boolean);
    const matchesCourse =
      courseFilter === "all" || linkedCourseIds.includes(courseFilter);
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

  const getIngredientStatus = (recipe: any) => {
    const ingredients = recipe.recipe_ingredients || [];
    if (ingredients.length === 0) return "no-ingredients";
    
    const hasLowStock = ingredients.some((ri: any) => 
      ri.inventory && ri.inventory.current_stock < ri.quantity_per_student * 10
    );
    
    if (hasLowStock) return "low-stock";
    return "ready";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-500">Ready</Badge>;
      case "low-stock":
        return <Badge className="bg-yellow-500">Low Stock</Badge>;
      case "no-ingredients":
        return <Badge variant="outline">No Ingredients Linked</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const totalRecipes = recipes?.length || 0;
  const readyRecipes = recipes?.filter(r => getIngredientStatus(r) === "ready").length || 0;
  const lowStockRecipes = recipes?.filter(r => getIngredientStatus(r) === "low-stock").length || 0;
  const noIngredientsRecipes = recipes?.filter(r => getIngredientStatus(r) === "no-ingredients").length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Super Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Super Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Utensils className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Recipe Inventory</h1>
            </div>
            <p className="text-muted-foreground">Manage recipes and their ingredient requirements</p>
          </div>
          <Button asChild>
            <Link to="/admin/recipe-ingredients">
              <Package className="h-4 w-4 mr-2" />
              Link Ingredients
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Recipes</div>
                <div className="text-3xl font-bold text-foreground">{totalRecipes}</div>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Ready to Cook</div>
                <div className="text-3xl font-bold text-green-500">{readyRecipes}</div>
              </div>
              <ChefHat className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Low Stock</div>
                <div className="text-3xl font-bold text-yellow-500">{lowStockRecipes}</div>
              </div>
              <Package className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Needs Setup</div>
                <div className="text-3xl font-bold text-muted-foreground">{noIngredientsRecipes}</div>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
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

        {/* Recipe Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">All Recipes</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Prep/Cook Time</TableHead>
                  <TableHead>Ingredients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes?.map((recipe) => {
                  const status = getIngredientStatus(recipe);
                  const ingredientCount = recipe.recipe_ingredients?.length || 0;
                  return (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="font-medium">{recipe.title}</div>
                        {recipe.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {recipe.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {((recipe as any).course_recipes || []).map((cr: any) => cr.courses).filter(Boolean).map((c: any) => (
                            <Badge key={c.id} variant="outline">{c.title}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {recipe.difficulty && (
                          <Badge className={getDifficultyColor(recipe.difficulty)}>
                            {recipe.difficulty}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {recipe.prep_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time}m prep
                            </span>
                          )}
                          {recipe.cook_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.cook_time}m cook
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Package className="h-3 w-3" />
                          {ingredientCount} linked
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecipe(recipe)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {filteredRecipes?.length === 0 && (
          <Card className="p-8 text-center mt-6">
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
                {getStatusBadge(getIngredientStatus(selectedRecipe))}
              </div>

              {selectedRecipe?.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              {/* Linked Ingredients */}
              {selectedRecipe?.recipe_ingredients?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Linked Ingredients</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Qty/Student</TableHead>
                          <TableHead>Current Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRecipe.recipe_ingredients.map((ri: any) => (
                          <TableRow key={ri.id}>
                            <TableCell className="font-medium">
                              {ri.inventory?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{ri.inventory?.category}</TableCell>
                            <TableCell>
                              {ri.quantity_per_student} {ri.inventory?.unit}
                            </TableCell>
                            <TableCell>
                              <span className={
                                ri.inventory?.current_stock < ri.quantity_per_student * 10
                                  ? "text-yellow-500 font-semibold"
                                  : "text-green-500 font-semibold"
                              }>
                                {ri.inventory?.current_stock} {ri.inventory?.unit}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

export default RecipeInventory;
