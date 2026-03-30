import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Package, Users, ChefHat, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IngredientRequirement {
  ingredientName: string;
  unit: string;
  category: string;
  totalRequired: number;
  recipes: string[];
}

interface ScheduledRecipe {
  recipeId: string;
  recipeTitle: string;
  studentCount: number;
  ingredientCount: number;
}

const DailyIngredients = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch bookings assigned to this chef for the selected date
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["chef-daily-bookings", formattedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          time_slot,
          status,
          recipe_id,
          recipes(id, title)
        `)
        .eq("booking_date", formattedDate)
        .eq("assigned_chef_id", user.id)
        .in("status", ["confirmed", "attended"])
        .not("recipe_id", "is", null);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recipe batches for the selected date
  const { data: recipeBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ["chef-daily-recipe-batches", formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_batches")
        .select(`
          id,
          recipe_id,
          time_slot,
          status,
          recipes(id, title),
          recipe_batch_memberships(id, student_id)
        `)
        .eq("batch_date", formattedDate)
        .in("status", ["scheduled", "in_progress"]);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all recipe ingredients
  const { data: recipeIngredients, isLoading: ingredientsLoading } = useQuery({
    queryKey: ["recipe-ingredients-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select(`
          recipe_id,
          inventory_id,
          quantity_per_student,
          inventory(id, name, unit, category)
        `);

      if (error) throw error;
      return data || [];
    },
  });

  // Build recipe → student count mapping
  const getRecipeStudentCount = (): Record<string, { count: number; title: string }> => {
    const recipeStudentCount: Record<string, { count: number; title: string }> = {};

    // Source 1: Individual bookings (each booking = 1 student)
    (bookings || []).forEach((booking: any) => {
      if (booking.recipe_id) {
        if (!recipeStudentCount[booking.recipe_id]) {
          recipeStudentCount[booking.recipe_id] = {
            count: 0,
            title: booking.recipes?.title || "Unknown Recipe",
          };
        }
        recipeStudentCount[booking.recipe_id].count += 1;
      }
    });

    // Source 2: Recipe batches (student count from memberships)
    (recipeBatches || []).forEach((batch: any) => {
      if (!batch.recipe_id) return;
      const memberCount = batch.recipe_batch_memberships?.length || 0;

      if (!recipeStudentCount[batch.recipe_id]) {
        recipeStudentCount[batch.recipe_id] = {
          count: 0,
          title: batch.recipes?.title || "Unknown Recipe",
        };
      }
      recipeStudentCount[batch.recipe_id].count = Math.max(
        recipeStudentCount[batch.recipe_id].count,
        memberCount
      );
    });

    return recipeStudentCount;
  };

  const recipeStudentCount = getRecipeStudentCount();

  // Get scheduled recipes summary with ingredient status
  const getScheduledRecipes = (): ScheduledRecipe[] => {
    return Object.entries(recipeStudentCount).map(([recipeId, { count, title }]) => {
      const ingredientCount = (recipeIngredients || []).filter(
        (ri: any) => ri.recipe_id === recipeId
      ).length;
      return {
        recipeId,
        recipeTitle: title,
        studentCount: count,
        ingredientCount,
      };
    });
  };

  // Calculate total ingredients needed
  const calculateRequirements = (): IngredientRequirement[] => {
    if (!recipeIngredients) return [];

    const ingredientMap: Record<string, IngredientRequirement> = {};

    Object.entries(recipeStudentCount).forEach(([recipeId, { count, title }]) => {
      const studentCount = Math.max(count, 1); // At least 1 student worth if class exists

      const ingredients = recipeIngredients.filter(
        (ri: any) => ri.recipe_id === recipeId
      );

      ingredients.forEach((ing: any) => {
        if (!ing.inventory) return;

        const key = ing.inventory_id;
        const quantityNeeded = ing.quantity_per_student * studentCount;

        if (!ingredientMap[key]) {
          ingredientMap[key] = {
            ingredientName: ing.inventory.name,
            unit: ing.inventory.unit,
            category: ing.inventory.category,
            totalRequired: 0,
            recipes: [],
          };
        }

        ingredientMap[key].totalRequired += quantityNeeded;
        if (!ingredientMap[key].recipes.includes(title)) {
          ingredientMap[key].recipes.push(title);
        }
      });
    });

    return Object.values(ingredientMap).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName)
    );
  };

  const scheduledRecipes = getScheduledRecipes();
  const requirements = calculateRequirements();
  const recipesWithNoIngredients = scheduledRecipes.filter(r => r.ingredientCount === 0);

  const uniqueRecipes = scheduledRecipes.length;
  const totalStudents = scheduledRecipes.reduce((sum, r) => sum + r.studentCount, 0);

  const isLoading = bookingsLoading || batchesLoading || ingredientsLoading;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Daily Ingredients</h1>
            <p className="text-muted-foreground">
              Ingredient requirements for your assigned classes
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueRecipes}</p>
                <p className="text-sm text-muted-foreground">Recipes</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requirements.length}</p>
                <p className="text-sm text-muted-foreground">Ingredients</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Scheduled Recipes Overview */}
        {scheduledRecipes.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Scheduled Recipes</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Ingredients Configured</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledRecipes.map((recipe) => (
                    <TableRow key={recipe.recipeId}>
                      <TableCell className="font-medium">{recipe.recipeTitle}</TableCell>
                      <TableCell className="text-right">{recipe.studentCount}</TableCell>
                      <TableCell className="text-right">{recipe.ingredientCount}</TableCell>
                      <TableCell>
                        {recipe.ingredientCount > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            No Ingredients Set
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Warning for recipes without ingredients */}
        {recipesWithNoIngredients.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {recipesWithNoIngredients.length === 1
                ? `The recipe "${recipesWithNoIngredients[0].recipeTitle}" does not have ingredients configured. Please contact the admin to set up ingredient requirements.`
                : `${recipesWithNoIngredients.length} recipes (${recipesWithNoIngredients.map(r => r.recipeTitle).join(", ")}) do not have ingredients configured. Please contact the admin to set up ingredient requirements.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Requirements Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Ingredient Requirements</h2>

          {requirements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {scheduledRecipes.length > 0 ? (
                <p>No ingredients configured for the scheduled recipes. Admin needs to add ingredient details to each recipe.</p>
              ) : (
                <p>No assigned sessions for this date</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total Required</TableHead>
                    <TableHead>Recipes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((req, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {req.ingredientName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {req.totalRequired.toFixed(1)} {req.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.recipes.map((recipe, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {recipe}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default DailyIngredients;