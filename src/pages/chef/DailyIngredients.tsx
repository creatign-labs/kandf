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
import { CalendarIcon, Loader2, Package, Users, ChefHat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface IngredientRequirement {
  ingredientName: string;
  unit: string;
  category: string;
  totalRequired: number;
  recipes: string[];
}

const DailyIngredients = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch bookings assigned to this chef with recipes for the selected date
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
      return data;
    },
  });

  // Fetch recipe ingredients
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
      return data;
    },
  });

  // Calculate ingredient requirements (no stock/cost info)
  const calculateRequirements = (): IngredientRequirement[] => {
    if (!bookings || !recipeIngredients) return [];

    // Count students per recipe
    const recipeStudentCount: Record<string, { count: number; title: string }> = {};
    bookings.forEach((booking: any) => {
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

    // Calculate total ingredients needed
    const ingredientMap: Record<string, IngredientRequirement> = {};

    Object.entries(recipeStudentCount).forEach(([recipeId, { count, title }]) => {
      const ingredients = recipeIngredients.filter(
        (ri: any) => ri.recipe_id === recipeId
      );

      ingredients.forEach((ing: any) => {
        if (!ing.inventory) return;

        const key = ing.inventory_id;
        const quantityNeeded = ing.quantity_per_student * count;

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

  const requirements = calculateRequirements();
  const totalStudents = bookings?.length || 0;
  const uniqueRecipes = [
    ...new Set(bookings?.map((b: any) => b.recipe_id).filter(Boolean)),
  ].length;

  const isLoading = bookingsLoading || ingredientsLoading;

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

        {/* Requirements Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Ingredient Requirements</h2>

          {requirements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assigned bookings with recipes for this date</p>
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
