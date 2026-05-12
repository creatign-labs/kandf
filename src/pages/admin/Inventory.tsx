import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Plus, Package, Loader2, Utensils } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    unit: "g",
    current_stock: 0,
    required_stock: 0,
    reorder_level: 10,
  });
  const queryClient = useQueryClient();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Aggregate ingredient demand from confirmed bookings over the next 7 days
  const { data: upcomingDemand } = useQuery({
    queryKey: ["upcoming-ingredient-demand-7d"],
    queryFn: async () => {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      const fromStr = today.toISOString().slice(0, 10);
      const toStr = end.toISOString().slice(0, 10);

      const { data: bks } = await supabase
        .from("bookings")
        .select("recipe_id, recipe_ids, student_id, booking_date")
        .gte("booking_date", fromStr)
        .lte("booking_date", toStr)
        .eq("status", "confirmed");

      const bookingRecipeIds = (booking: any) =>
        Array.from(new Set([booking.recipe_id, ...((booking.recipe_ids as string[]) || [])].filter(Boolean))) as string[];
      const recipeIds = [...new Set((bks || []).flatMap((b: any) => bookingRecipeIds(b)))];
      if (recipeIds.length === 0) return {} as Record<string, number>;

      const { data: ris } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id, inventory_id, quantity_per_student")
        .in("recipe_id", recipeIds);

      const recipeCount: Record<string, number> = {};
      (bks || []).forEach((b: any) => {
        bookingRecipeIds(b).forEach((recipeId) => {
          recipeCount[recipeId] = (recipeCount[recipeId] || 0) + 1;
        });
      });

      const demand: Record<string, number> = {};
      (ris || []).forEach((ri) => {
        const count = recipeCount[ri.recipe_id] || 0;
        const need = Number(ri.quantity_per_student) * count;
        demand[ri.inventory_id] = (demand[ri.inventory_id] || 0) + need;
      });
      return demand;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { error } = await supabase.from("inventory").insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsAddDialogOpen(false);
      setNewItem({ name: "", unit: "g", current_stock: 0, required_stock: 0, reorder_level: 10 });
      toast({ title: "Item added successfully" });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, current_stock }: { id: string; current_stock: number }) => {
      const { error } = await supabase
        .from("inventory")
        .update({ current_stock })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Stock updated" });
    },
  });

  const getStatus = (current: number, required: number, reorderLevel: number) => {
    if (current <= reorderLevel * 0.3) return "critical";
    if (current <= reorderLevel) return "low";
    return "ok";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-500">Sufficient</Badge>;
      case "low":
        return <Badge className="bg-yellow-500">Low Stock</Badge>;
      case "critical":
        return <Badge className="bg-red-500">Critical</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getProgressColor = (current: number, required: number) => {
    const ratio = current / required;
    if (ratio >= 1) return "bg-green-500";
    if (ratio >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const filteredInventory = inventory?.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalItems = filteredInventory?.filter(item => 
    getStatus(item.current_stock, item.required_stock, item.reorder_level) === "critical"
  ) || [];
  
  const lowStockItems = filteredInventory?.filter(item => 
    getStatus(item.current_stock, item.required_stock, item.reorder_level) === "low"
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels and manage ingredients</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Critical Items</div>
                <div className="text-3xl font-bold text-red-500">{criticalItems.length}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Low Stock</div>
                <div className="text-3xl font-bold text-yellow-500">{lowStockItems.length}</div>
              </div>
              <Package className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Items</div>
                <div className="text-3xl font-bold text-foreground">{inventory?.length || 0}</div>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {criticalItems.length > 0 && (
          <Card className="p-4 mb-6 border-red-500 bg-red-50 dark:bg-red-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">Critical Stock Alert</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                  The following items are critically low and need immediate restocking:
                </p>
                <div className="flex flex-wrap gap-2">
                  {criticalItems.map((item) => (
                    <Badge key={item.id} variant="outline" className="border-red-500">
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Current Inventory</h2>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/admin/required-daily-ingredients">
                  <Utensils className="h-4 w-4 mr-2" />
                  Required Daily Ingredients
                </Link>
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search items..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Item Name</Label>
                      <Input 
                        id="name" 
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="pieces">pieces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current">Closing Stock</Label>
                        <Input 
                          id="current" 
                          type="number"
                          value={newItem.current_stock || ""}
                          onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="required">Required Stock</Label>
                        <Input 
                          id="required" 
                          type="number"
                          value={newItem.required_stock || ""}
                          onChange={(e) => setNewItem({ ...newItem, required_stock: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => addItemMutation.mutate(newItem)}
                      disabled={!newItem.name || !newItem.unit}
                    >
                      Add Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Closing Stock</TableHead>
                    <TableHead>Required Stock</TableHead>
                    <TableHead>Upcoming Demand (7d)</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory?.map((item) => {
                    const percentage = item.required_stock > 0 
                      ? (item.current_stock / item.required_stock) * 100 
                      : 100;
                    const status = getStatus(item.current_stock, item.required_stock, item.reorder_level);
                    const demand = upcomingDemand?.[item.id] || 0;
                    const demandShort = demand > item.current_stock;
                    return (
                      <TableRow key={item.id} className={demandShort ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.current_stock}</span> {item.unit}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.required_stock}</span> {item.unit}
                        </TableCell>
                        <TableCell>
                          {demand > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${demandShort ? "text-destructive" : ""}`}>
                                {demand.toFixed(2)} {item.unit}
                              </span>
                              {demandShort && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Short {(demand - item.current_stock).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getProgressColor(item.current_stock, item.required_stock)}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm w-12 text-right">{Math.round(percentage)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const newStock = prompt("Enter new stock level:", String(item.current_stock));
                                if (newStock) {
                                  updateStockMutation.mutate({ id: item.id, current_stock: Number(newStock) });
                                }
                              }}
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Inventory;
