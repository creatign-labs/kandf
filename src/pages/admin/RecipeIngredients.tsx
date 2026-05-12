import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, ChefHat, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RecipeIngredients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    recipe_id: "",
    inventory_id: "",
    quantity_per_student: 0,
    notes: "",
  });
  const queryClient = useQueryClient();

  // Fetch recipes
  const { data: recipes } = useQuery({
    queryKey: ["recipes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, course_recipes(courses(id, title))")
        .order("title");

      if (error) throw error;
      // Flatten linked course titles into a single string for display
      return (data || []).map((r: any) => ({
        ...r,
        courses: {
          title: (r.course_recipes || [])
            .map((cr: any) => cr.courses?.title)
            .filter(Boolean)
            .join(", "),
        },
      }));
    },
  });

  // Fetch inventory items
  const { data: inventory } = useQuery({
    queryKey: ["inventory-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch recipe ingredients
  const { data: recipeIngredients, isLoading } = useQuery({
    queryKey: ["recipe-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*, recipes(id, title, course_recipes(courses(id, title))), inventory(id, name, unit, category)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Flatten linked course titles for the recipe display
      return (data || []).map((row: any) => ({
        ...row,
        recipes: row.recipes
          ? {
              ...row.recipes,
              courses: {
                title: (row.recipes.course_recipes || [])
                  .map((cr: any) => cr.courses?.title)
                  .filter(Boolean)
                  .join(", "),
              },
            }
          : row.recipes,
      }));
    },
  });

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async (data: typeof newIngredient) => {
      const { error } = await supabase.from("recipe_ingredients").insert({
        recipe_id: data.recipe_id,
        inventory_id: data.inventory_id,
        quantity_per_student: data.quantity_per_student,
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-ingredients"] });
      setIsAddDialogOpen(false);
      setNewIngredient({ recipe_id: "", inventory_id: "", quantity_per_student: 0, notes: "" });
      toast({ title: "Ingredient linked to recipe" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete ingredient mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-ingredients"] });
      toast({ title: "Ingredient removed from recipe" });
    },
  });

  const filteredIngredients = recipeIngredients?.filter((ri) => {
    const matchesSearch =
      ri.recipes?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ri.inventory?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRecipe = !selectedRecipe || selectedRecipe === "all" || ri.recipe_id === selectedRecipe;
    return matchesSearch && matchesRecipe;
  });

  // Group by recipe for display
  const groupedByRecipe = filteredIngredients?.reduce((acc: Record<string, any[]>, ri) => {
    const recipeId = ri.recipe_id;
    if (!acc[recipeId]) acc[recipeId] = [];
    acc[recipeId].push(ri);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Recipe Ingredients</h1>
          <p className="text-muted-foreground">
            Link inventory items to recipes with per-student quantities
          </p>
        </div>

        {/* Filters & Actions */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes or ingredients..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by recipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipes</SelectItem>
                {recipes?.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Link Ingredient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Ingredient to Recipe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Recipe</Label>
                    <Select
                      value={newIngredient.recipe_id}
                      onValueChange={(value) => setNewIngredient({ ...newIngredient, recipe_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes?.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.title} ({recipe.courses?.title})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ingredient</Label>
                    <Select
                      value={newIngredient.inventory_id}
                      onValueChange={(value) => setNewIngredient({ ...newIngredient, inventory_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity per Student</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newIngredient.quantity_per_student || ""}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          quantity_per_student: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount needed for one student to complete this recipe
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      value={newIngredient.notes}
                      onChange={(e) => setNewIngredient({ ...newIngredient, notes: e.target.value })}
                      placeholder="E.g., can substitute with..."
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => addIngredientMutation.mutate(newIngredient)}
                    disabled={
                      !newIngredient.recipe_id ||
                      !newIngredient.inventory_id ||
                      newIngredient.quantity_per_student <= 0 ||
                      addIngredientMutation.isPending
                    }
                  >
                    {addIngredientMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Link Ingredient"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Grouped Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByRecipe && Object.entries(groupedByRecipe).map(([recipeId, ingredients]) => {
              const recipe = recipes?.find(r => r.id === recipeId);
              return (
                <Card key={recipeId} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ChefHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{recipe?.title}</h3>
                      <p className="text-sm text-muted-foreground">{recipe?.courses?.title}</p>
                    </div>
                    <Badge className="ml-auto">{ingredients.length} ingredients</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Qty/Student</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ri: any) => (
                        <TableRow key={ri.id}>
                          <TableCell className="font-medium">{ri.inventory?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ri.inventory?.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {ri.quantity_per_student} {ri.inventory?.unit}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ri.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteIngredientMutation.mutate(ri.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              );
            })}
            {(!groupedByRecipe || Object.keys(groupedByRecipe).length === 0) && (
              <Card className="p-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recipe Ingredients Configured</h3>
                <p className="text-muted-foreground mb-4">
                  Link inventory items to recipes to enable automatic checklist generation
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Link First Ingredient
                </Button>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeIngredients;
