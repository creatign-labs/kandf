import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CalendarIcon, ChefHat, Loader2, Package, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface IngredientRequirement {
  inventory_id: string;
  ingredient_name: string;
  unit: string;
  quantity_per_student: number;
  student_count: number;
  total_required: number;
  current_stock: number;
  sufficient: boolean;
  recipe_title: string;
}

interface ChefGroup {
  chef_id: string | null;
  chef_name: string;
  recipes: {
    recipe_id: string;
    recipe_title: string;
    student_count: number;
    ingredients: IngredientRequirement[];
  }[];
}

const RequiredDailyIngredients = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["required-daily-ingredients", formattedDate],
    queryFn: async () => {
      // 1. Get all bookings for the date
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, recipe_id, assigned_chef_id, student_id, time_slot")
        .eq("booking_date", formattedDate)
        .eq("status", "confirmed");
      if (bErr) throw bErr;

      if (!bookings || bookings.length === 0) return { chefGroups: [], cumulative: [] };

      // 2. Get unique recipe IDs
      const recipeIds = [...new Set(bookings.filter(b => b.recipe_id).map(b => b.recipe_id!))];
      if (recipeIds.length === 0) return { chefGroups: [], cumulative: [] };

      // 3. Get recipe details
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, title")
        .in("id", recipeIds);

      // 4. Get recipe ingredients with inventory details
      const { data: recipeIngredients } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id, inventory_id, quantity_per_student, inventory(id, name, unit, current_stock)")
        .in("recipe_id", recipeIds);

      // 5. Get chef profiles
      const chefIds = [...new Set(bookings.filter(b => b.assigned_chef_id).map(b => b.assigned_chef_id!))];
      let chefProfiles: Record<string, string> = {};
      if (chefIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", chefIds);
        (profiles || []).forEach(p => {
          chefProfiles[p.id] = `${p.first_name} ${p.last_name}`;
        });
      }

      const recipeMap = new Map((recipes || []).map(r => [r.id, r.title]));

      // Group bookings by chef -> recipe -> student count
      const chefRecipeMap: Record<string, Record<string, string[]>> = {};
      bookings.forEach(b => {
        if (!b.recipe_id) return;
        const chefKey = b.assigned_chef_id || "unassigned";
        if (!chefRecipeMap[chefKey]) chefRecipeMap[chefKey] = {};
        if (!chefRecipeMap[chefKey][b.recipe_id]) chefRecipeMap[chefKey][b.recipe_id] = [];
        chefRecipeMap[chefKey][b.recipe_id].push(b.student_id);
      });

      // Build chef groups
      const chefGroups: ChefGroup[] = Object.entries(chefRecipeMap).map(([chefId, recipesObj]) => ({
        chef_id: chefId === "unassigned" ? null : chefId,
        chef_name: chefId === "unassigned" ? "Unassigned" : (chefProfiles[chefId] || "Unknown Chef"),
        recipes: Object.entries(recipesObj).map(([recipeId, studentIds]) => {
          const studentCount = studentIds.length;
          const ingredients = (recipeIngredients || [])
            .filter(ri => ri.recipe_id === recipeId)
            .map(ri => {
              const inv = ri.inventory as any;
              return {
                inventory_id: ri.inventory_id,
                ingredient_name: inv?.name || "Unknown",
                unit: inv?.unit || "",
                quantity_per_student: Number(ri.quantity_per_student),
                student_count: studentCount,
                total_required: Number(ri.quantity_per_student) * studentCount,
                current_stock: Number(inv?.current_stock || 0),
                sufficient: Number(inv?.current_stock || 0) >= Number(ri.quantity_per_student) * studentCount,
                recipe_title: recipeMap.get(recipeId) || "Unknown",
              };
            });
          return {
            recipe_id: recipeId,
            recipe_title: recipeMap.get(recipeId) || "Unknown",
            student_count: studentCount,
            ingredients,
          };
        }),
      }));

      // Build cumulative list
      const cumulativeMap: Record<string, IngredientRequirement> = {};
      chefGroups.forEach(cg => {
        cg.recipes.forEach(r => {
          r.ingredients.forEach(ing => {
            if (cumulativeMap[ing.inventory_id]) {
              cumulativeMap[ing.inventory_id].total_required += ing.total_required;
              cumulativeMap[ing.inventory_id].student_count += ing.student_count;
            } else {
              cumulativeMap[ing.inventory_id] = { ...ing };
            }
          });
        });
      });
      const cumulative = Object.values(cumulativeMap).map(c => ({
        ...c,
        sufficient: c.current_stock >= c.total_required,
      }));

      return { chefGroups, cumulative };
    },
  });

  const chefGroups = data?.chefGroups || [];
  const cumulative = data?.cumulative || [];
  const insufficientCount = cumulative.filter(c => !c.sufficient).length;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Required Daily Ingredients</h1>
          <p className="text-muted-foreground">
            View ingredient requirements for a specific date, grouped by chef
          </p>
        </div>

        {/* Date Picker */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="font-medium">Select Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chefGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground">
              There are no confirmed bookings with assigned recipes for {format(selectedDate, "PPP")}
            </p>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Ingredients</div>
                    <div className="text-3xl font-bold">{cumulative.length}</div>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Chefs Assigned</div>
                    <div className="text-3xl font-bold">{chefGroups.filter(c => c.chef_id).length}</div>
                  </div>
                  <ChefHat className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Insufficient Stock</div>
                    <div className={`text-3xl font-bold ${insufficientCount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {insufficientCount}
                    </div>
                  </div>
                  <Package className={`h-8 w-8 ${insufficientCount > 0 ? 'text-destructive' : 'text-green-600'}`} />
                </div>
              </Card>
            </div>

            {/* Cumulative Requirements */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Cumulative Ingredient Requirements</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Total Required</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Shortfall</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cumulative.sort((a, b) => (a.sufficient ? 1 : 0) - (b.sufficient ? 1 : 0)).map((item) => (
                      <TableRow key={item.inventory_id}>
                        <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                        <TableCell>{item.total_required} {item.unit}</TableCell>
                        <TableCell>{item.current_stock} {item.unit}</TableCell>
                        <TableCell>
                          {item.sufficient ? (
                            <span className="text-green-600">—</span>
                          ) : (
                            <span className="text-destructive font-semibold">
                              {(item.total_required - item.current_stock).toFixed(2)} {item.unit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={item.sufficient ? "bg-green-500" : "bg-destructive"}>
                            {item.sufficient ? "Sufficient" : "Insufficient"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Chef-wise Breakdown */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Chef-wise Breakdown</h2>
              <Accordion type="multiple" className="w-full">
                {chefGroups.map((chef) => (
                  <AccordionItem key={chef.chef_id || "unassigned"} value={chef.chef_id || "unassigned"}>
                    <AccordionTrigger className="text-lg">
                      <div className="flex items-center gap-3">
                        <ChefHat className="h-5 w-5 text-primary" />
                        <span>{chef.chef_name}</span>
                        <Badge variant="outline" className="ml-2">
                          {chef.recipes.length} recipe(s)
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {chef.recipes.map((recipe) => (
                          <div key={recipe.recipe_id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold">{recipe.recipe_title}</h4>
                              <Badge variant="secondary" className="gap-1">
                                <Users className="h-3 w-3" />
                                {recipe.student_count} student(s)
                              </Badge>
                            </div>
                            {recipe.ingredients.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Ingredient</TableHead>
                                    <TableHead>Per Student</TableHead>
                                    <TableHead>Total Needed</TableHead>
                                    <TableHead>In Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {recipe.ingredients.map((ing) => (
                                    <TableRow key={ing.inventory_id}>
                                      <TableCell>{ing.ingredient_name}</TableCell>
                                      <TableCell>{ing.quantity_per_student} {ing.unit}</TableCell>
                                      <TableCell className="font-semibold">{ing.total_required} {ing.unit}</TableCell>
                                      <TableCell>{ing.current_stock} {ing.unit}</TableCell>
                                      <TableCell>
                                        <Badge className={ing.sufficient ? "bg-green-500" : "bg-destructive"}>
                                          {ing.sufficient ? "OK" : "Low"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No ingredients linked to this recipe</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default RequiredDailyIngredients;
