import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ChefHat, Clock, Loader2, Package, Plus, Trash2, Youtube, IndianRupee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminRecipes = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    recipe_code: "",
    video_url: "",
    cost: "",
  });
  const [selectedIngredients, setSelectedIngredients] = useState<
    { inventory_id: string; quantity_per_student: number; unit: string }[]
  >([]);

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

  const { data: courses } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory-items-for-recipe"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("id, name, unit").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: ingredientCounts } = useQuery({
    queryKey: ["recipe-ingredient-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipe_ingredients").select("recipe_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((ri) => { counts[ri.recipe_id] = (counts[ri.recipe_id] || 0) + 1; });
      return counts;
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async () => {
      const { data: newRecipe, error } = await supabase
        .from("recipes")
        .insert({
          title: formData.title,
          recipe_code: formData.recipe_code || null,
          video_url: formData.video_url || null,
          cost: formData.cost === "" ? null : Number(formData.cost),
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Add ingredients
      if (selectedIngredients.length > 0 && newRecipe) {
        const { error: ingError } = await supabase.from("recipe_ingredients").insert(
          selectedIngredients.map((ing) => ({
            recipe_id: newRecipe.id,
            inventory_id: ing.inventory_id,
            quantity_per_student: ing.quantity_per_student,
            unit: ing.unit || null,
          }))
        );
        if (ingError) throw ingError;
      }
      return newRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe-ingredient-counts"] });
      toast({ title: "Recipe created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "", recipe_code: "", video_url: "", cost: "",
    });
    setSelectedIngredients([]);
  };

  const addIngredient = () => {
    setSelectedIngredients([...selectedIngredients, { inventory_id: "", quantity_per_student: 0, unit: "g" }]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setSelectedIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredRecipes = recipes?.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recipe as any).recipe_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "all" || recipe.course_id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "hard": return "bg-red-500";
      default: return "bg-muted";
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
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="h-4 w-4" />
                  Add New Recipe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Recipe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recipe Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Apple Pie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Recipe Code</Label>
                      <Input
                        value={formData.recipe_code}
                        onChange={(e) => setFormData({ ...formData, recipe_code: e.target.value })}
                        placeholder="e.g., RCP-001"
                        maxLength={20}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      Cost (₹)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      YouTube Video URL
                    </Label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      maxLength={500}
                    />
                  </div>

                  {/* Ingredients Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Ingredients (from Inventory)
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="gap-1">
                        <Plus className="h-3 w-3" /> Add Ingredient
                      </Button>
                    </div>
                    {selectedIngredients.length > 0 ? (
                      <div className="space-y-2 border rounded-md p-3">
                        {selectedIngredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Select
                              value={ing.inventory_id}
                              onValueChange={(v) => updateIngredient(idx, "inventory_id", v)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select ingredient" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems?.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Qty/student"
                              className="w-24"
                              value={ing.quantity_per_student || ""}
                              onChange={(e) => updateIngredient(idx, "quantity_per_student", Number(e.target.value))}
                            />
                            <Select
                              value={ing.unit}
                              onValueChange={(v) => updateIngredient(idx, "unit", v)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="pieces">pieces</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-8 w-8"
                              onClick={() => removeIngredient(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No ingredients added yet</p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => createRecipeMutation.mutate()}
                    disabled={!formData.title || createRecipeMutation.isPending}
                  >
                    {createRecipeMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      "Create Recipe"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" asChild>
              <Link to="/admin/recipe-ingredients">
                <Package className="h-4 w-4 mr-2" />
                Manage Ingredients
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes by name or code..."
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
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
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
              <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                <ChefHat className="h-16 w-16 text-primary/50" />
                {recipe.video_url && (
                  <Badge className="absolute top-2 right-2 bg-red-500 gap-1">
                    <Youtube className="h-3 w-3" /> Video
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{recipe.title}</h3>
                    {(recipe as any).recipe_code && (
                      <span className="text-xs text-muted-foreground font-mono">{(recipe as any).recipe_code}</span>
                    )}
                  </div>
                  {recipe.difficulty && (
                    <Badge className={getDifficultyColor(recipe.difficulty)}>{recipe.difficulty}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {recipe.description || "No description available"}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {recipe.prep_time && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Prep: {recipe.prep_time}m</span>
                  )}
                  {recipe.cook_time && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Cook: {recipe.cook_time}m</span>
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
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </Card>
        )}

        {/* Recipe Detail Dialog */}
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {selectedRecipe?.title}
                {(selectedRecipe as any)?.recipe_code && (
                  <Badge variant="outline" className="font-mono text-xs">{(selectedRecipe as any).recipe_code}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {selectedRecipe?.video_url && (
                <VideoPlayer videoUrl={selectedRecipe.video_url} title={selectedRecipe.title} />
              )}
              <div className="flex flex-wrap gap-3">
                {selectedRecipe?.difficulty && (
                  <Badge className={getDifficultyColor(selectedRecipe.difficulty)}>{selectedRecipe.difficulty}</Badge>
                )}
                {selectedRecipe?.prep_time && <Badge variant="outline">Prep: {selectedRecipe.prep_time} min</Badge>}
                {selectedRecipe?.cook_time && <Badge variant="outline">Cook: {selectedRecipe.cook_time} min</Badge>}
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
                  <div className="prose prose-sm text-muted-foreground whitespace-pre-line">{selectedRecipe.instructions}</div>
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
