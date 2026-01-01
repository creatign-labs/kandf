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
import { cn } from "@/lib/utils";

interface IngredientRequirement {
  inventoryId: string;
  ingredientName: string;
  unit: string;
  category: string;
  totalRequired: number;
  currentStock: number;
  shortfall: number;
  recipes: string[];
}

const DailyIngredients = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch bookings with assigned recipes for the selected date
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["daily-bookings", formattedDate],
    queryFn: async () => {
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
        .eq("status", "confirmed")
        .not("recipe_id", "is", null);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recipe ingredients with inventory details
  const { data: recipeIngredients, isLoading: ingredientsLoading } = useQuery({
    queryKey: ["recipe-ingredients-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select(`
          recipe_id,
          inventory_id,
          quantity_per_student,
          inventory(id, name, unit, category, current_stock, reorder_level)
        `);

      if (error) throw error;
      return data;
    },
  });

  // Calculate ingredient requirements
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
            inventoryId: ing.inventory_id,
            ingredientName: ing.inventory.name,
            unit: ing.inventory.unit,
            category: ing.inventory.category,
            totalRequired: 0,
            currentStock: ing.inventory.current_stock,
            shortfall: 0,
            recipes: [],
          };
        }

        ingredientMap[key].totalRequired += quantityNeeded;
        if (!ingredientMap[key].recipes.includes(title)) {
          ingredientMap[key].recipes.push(title);
        }
      });
    });

    // Calculate shortfalls
    Object.values(ingredientMap).forEach((item) => {
      item.shortfall = Math.max(0, item.totalRequired - item.currentStock);
    });

    return Object.values(ingredientMap).sort((a, b) => 
      b.shortfall - a.shortfall || a.ingredientName.localeCompare(b.ingredientName)
    );
  };

  const requirements = calculateRequirements();
  const totalStudents = bookings?.length || 0;
  const uniqueRecipes = [...new Set(bookings?.map((b: any) => b.recipe_id).filter(Boolean))].length;
  const shortfallItems = requirements.filter((r) => r.shortfall > 0);

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
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Daily Ingredients
            </h1>
            <p className="text-muted-foreground">
              Auto-calculated requirements based on bookings
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <Card className={cn(
            "p-4",
            shortfallItems.length > 0 && "border-destructive bg-destructive/5"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                shortfallItems.length > 0 ? "bg-destructive/10" : "bg-green-500/10"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  shortfallItems.length > 0 ? "text-destructive" : "text-green-500"
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold">{shortfallItems.length}</p>
                <p className="text-sm text-muted-foreground">Shortfalls</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Shortfall Alert */}
        {shortfallItems.length > 0 && (
          <Card className="p-4 mb-6 border-destructive bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-2">
                  Insufficient Stock Alert
                </h3>
                <div className="flex flex-wrap gap-2">
                  {shortfallItems.map((item) => (
                    <Badge key={item.inventoryId} variant="destructive">
                      {item.ingredientName}: need {item.shortfall.toFixed(1)} more {item.unit}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Requirements Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Ingredient Requirements</h2>

          {requirements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings with assigned recipes for this date</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead>Recipes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((req) => (
                    <TableRow key={req.inventoryId}>
                      <TableCell className="font-medium">
                        {req.ingredientName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.totalRequired.toFixed(1)} {req.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.currentStock.toFixed(1)} {req.unit}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        req.shortfall > 0 ? "text-destructive" : "text-green-600"
                      )}>
                        {req.shortfall > 0 ? `-${req.shortfall.toFixed(1)}` : "OK"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.recipes.map((recipe, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {recipe}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.shortfall > 0 ? (
                          <Badge variant="destructive">Low</Badge>
                        ) : (
                          <Badge className="bg-green-500 hover:bg-green-600">Ready</Badge>
                        )}
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
