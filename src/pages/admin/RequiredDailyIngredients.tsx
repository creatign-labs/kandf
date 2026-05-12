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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChefHat, Loader2, Package, Users, Pencil, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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

function UpdateStockDialog({
  inventoryId,
  ingredientName,
  unit,
  currentStock,
  onUpdated,
}: {
  inventoryId: string;
  ingredientName: string;
  unit: string;
  currentStock: number;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState<string>("");
  const [movement, setMovement] = useState<"in" | "out" | "set">("in");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(delta);
    if (isNaN(num) || num < 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let newStock = currentStock;
      let movementType = movement;
      let ledgerQty = num;
      if (movement === "in") newStock = currentStock + num;
      else if (movement === "out") newStock = Math.max(0, currentStock - num);
      else {
        // "set" — convert to in/out delta for ledger
        const diff = num - currentStock;
        newStock = num;
        movementType = diff >= 0 ? "in" : "out";
        ledgerQty = Math.abs(diff);
      }

      const { error: invErr } = await supabase
        .from("inventory")
        .update({ current_stock: newStock })
        .eq("id", inventoryId);
      if (invErr) throw invErr;

      if (ledgerQty > 0) {
        await supabase.from("inventory_ledger").insert({
          inventory_id: inventoryId,
          movement_type: movementType,
          quantity: ledgerQty,
          performed_by: user.id,
          notes: notes || `Stock ${movement} via Required Ingredients`,
        });
      }

      toast({ title: "Stock updated" });
      setOpen(false);
      setDelta("");
      setNotes("");
      onUpdated();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="h-3 w-3" /> Update
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock — {ingredientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Current stock: <span className="font-semibold text-foreground">{currentStock} {unit}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["in", "out", "set"] as const).map((m) => (
              <Button
                key={m}
                variant={movement === m ? "default" : "outline"}
                size="sm"
                onClick={() => setMovement(m)}
                type="button"
              >
                {m === "in" ? "Add" : m === "out" ? "Remove" : "Set to"}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="qty">Quantity ({unit})</Label>
            <Input id="qty" type="number" min="0" step="any" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RequiredDailyIngredients = () => {
  const [fromDate, setFromDate] = useState<Date>(addDays(new Date(), 1));
  const [toDate, setToDate] = useState<Date>(addDays(new Date(), 1));
  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["required-daily-ingredients", fromStr, toStr],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, recipe_id, recipe_ids, assigned_chef_id, assigned_chef_ids, student_id, time_slot, booking_date")
        .gte("booking_date", fromStr)
        .lte("booking_date", toStr)
        .eq("status", "confirmed");
      if (bErr) throw bErr;

      if (!bookings || bookings.length === 0) return { chefGroups: [], cumulative: [] };

      const getRecipeIds = (booking: any) =>
        Array.from(new Set([booking.recipe_id, ...((booking.recipe_ids as string[]) || [])].filter(Boolean))) as string[];
      const getChefIds = (booking: any) =>
        Array.from(new Set([booking.assigned_chef_id, ...((booking.assigned_chef_ids as string[]) || [])].filter(Boolean))) as string[];

      const recipeIds = [...new Set(bookings.flatMap((b: any) => getRecipeIds(b)))];
      if (recipeIds.length === 0) return { chefGroups: [], cumulative: [] };

      const { data: recipes } = await supabase
        .from("recipes").select("id, title").in("id", recipeIds);

      const { data: recipeIngredients } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id, inventory_id, quantity_per_student, inventory(id, name, unit, current_stock)")
        .in("recipe_id", recipeIds);

      const chefIds = [...new Set(bookings.flatMap((b: any) => getChefIds(b)))];
      let chefProfiles: Record<string, string> = {};
      if (chefIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("id, first_name, last_name").in("id", chefIds);
        (profiles || []).forEach(p => {
          chefProfiles[p.id] = `${p.first_name} ${p.last_name}`;
        });
      }

      const recipeMap = new Map((recipes || []).map(r => [r.id, r.title]));

      const chefRecipeMap: Record<string, Record<string, string[]>> = {};
      const recipeStudentMap: Record<string, string[]> = {};
      bookings.forEach((b: any) => {
        const bookingRecipeIds = getRecipeIds(b);
        if (bookingRecipeIds.length === 0) return;
        const bookingChefIds = getChefIds(b);
        const chefKeys = bookingChefIds.length > 0 ? bookingChefIds : ["unassigned"];

        bookingRecipeIds.forEach((recipeId) => {
          if (!recipeStudentMap[recipeId]) recipeStudentMap[recipeId] = [];
          recipeStudentMap[recipeId].push(b.student_id);

          chefKeys.forEach((chefKey) => {
            if (!chefRecipeMap[chefKey]) chefRecipeMap[chefKey] = {};
            if (!chefRecipeMap[chefKey][recipeId]) chefRecipeMap[chefKey][recipeId] = [];
            chefRecipeMap[chefKey][recipeId].push(b.student_id);
          });
        });
      });

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
          return { recipe_id: recipeId, recipe_title: recipeMap.get(recipeId) || "Unknown", student_count: studentCount, ingredients };
        }),
      }));

      const cumulativeMap: Record<string, IngredientRequirement> = {};
      Object.entries(recipeStudentMap).forEach(([recipeId, studentIds]) => {
        const studentCount = studentIds.length;
        (recipeIngredients || []).filter(ri => ri.recipe_id === recipeId).forEach((ri) => {
          const inv = ri.inventory as any;
          const totalRequired = Number(ri.quantity_per_student) * studentCount;
          if (cumulativeMap[ri.inventory_id]) {
            cumulativeMap[ri.inventory_id].total_required += totalRequired;
            cumulativeMap[ri.inventory_id].student_count += studentCount;
          } else {
            cumulativeMap[ri.inventory_id] = {
              inventory_id: ri.inventory_id,
              ingredient_name: inv?.name || "Unknown",
              unit: inv?.unit || "",
              quantity_per_student: Number(ri.quantity_per_student),
              student_count: studentCount,
              total_required: totalRequired,
              current_stock: Number(inv?.current_stock || 0),
              sufficient: Number(inv?.current_stock || 0) >= totalRequired,
              recipe_title: recipeMap.get(recipeId) || "Unknown",
            };
          }
        });
      });
      const cumulative = Object.values(cumulativeMap).map(c => ({
        ...c,
        sufficient: c.current_stock >= c.total_required,
      }));

      return { chefGroups, cumulative };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["required-daily-ingredients"] });
  };

  const chefGroups = data?.chefGroups || [];
  const cumulative = data?.cumulative || [];
  const insufficientCount = cumulative.filter(c => !c.sufficient).length;
  const sameDay = fromStr === toStr;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Required Daily Ingredients</h1>
          <p className="text-muted-foreground">
            View ingredient requirements for a date or a date range, grouped by chef
          </p>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <span className="font-medium">Date Range:</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    From: {format(fromDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => {
                      if (!d) return;
                      setFromDate(d);
                      if (toDate < d) setToDate(d);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    To: {format(toDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => d && setToDate(d)}
                    disabled={(d) => d < fromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {!sameDay && (
              <Badge variant="secondary">{Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1} days</Badge>
            )}
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
              There are no confirmed bookings with assigned recipes in this range.
            </p>
          </Card>
        ) : (
          <>
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
                      <TableHead>Action</TableHead>
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
                        <TableCell>
                          <UpdateStockDialog
                            inventoryId={item.inventory_id}
                            ingredientName={item.ingredient_name}
                            unit={item.unit}
                            currentStock={item.current_stock}
                            onUpdated={refresh}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

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
                        {chef.recipes.map((recipe) => {
                          const shortIngredients = recipe.ingredients.filter((i) => !i.sufficient);
                          return (
                          <div key={recipe.recipe_id} className={`border rounded-lg p-4 ${shortIngredients.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                {recipe.recipe_title}
                                {shortIngredients.length > 0 && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {shortIngredients.length} short
                                  </Badge>
                                )}
                              </h4>
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
                          );
                        })}
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
