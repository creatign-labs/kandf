import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  ShoppingCart,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

const InventoryChecklist = () => {
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  // Check if current user is super_admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      return !!data;
    },
  });

  // Fetch existing checklist for the date
  const { data: checklist, isLoading: checklistLoading } = useQuery({
    queryKey: ["inventory-checklist", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_checklists")
        .select(`
          *,
          inventory_checklist_items(
            *,
            inventory(name, unit, category)
          )
        `)
        .eq("checklist_date", selectedDate)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch bookings for the selected date to calculate requirements
  const { data: bookingsData } = useQuery({
    queryKey: ["bookings-for-checklist", selectedDate],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*, courses(id, title)")
        .eq("booking_date", selectedDate)
        .eq("status", "confirmed");

      if (error) throw error;
      return bookings;
    },
  });

  // Fetch recipe ingredients
  const { data: recipeIngredients } = useQuery({
    queryKey: ["recipe-ingredients-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*, recipes(course_id, title), inventory(id, name, unit, current_stock)");

      if (error) throw error;
      return data;
    },
  });

  // Generate checklist mutation
  const generateChecklistMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate required quantities based on bookings and recipes
      const courseIds = [...new Set(bookingsData?.map(b => b.courses?.id) || [])];
      const studentCount = bookingsData?.length || 0;

      // Get ingredients for courses being taught
      const relevantIngredients = recipeIngredients?.filter(ri =>
        courseIds.includes(ri.recipes?.course_id)
      ) || [];

      // Aggregate by inventory item
      const aggregated: Record<string, { required: number; current: number; inventoryId: string }> = {};

      relevantIngredients.forEach(ri => {
        const inventoryId = ri.inventory_id;
        if (!aggregated[inventoryId]) {
          aggregated[inventoryId] = {
            required: 0,
            current: ri.inventory?.current_stock || 0,
            inventoryId,
          };
        }
        aggregated[inventoryId].required += (ri.quantity_per_student || 0) * studentCount;
      });

      // Create checklist
      const { data: newChecklist, error: checklistError } = await supabase
        .from("inventory_checklists")
        .insert({
          checklist_date: selectedDate,
          generated_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create checklist items
      const items = Object.entries(aggregated).map(([_, value]) => ({
        checklist_id: newChecklist.id,
        inventory_id: value.inventoryId,
        required_quantity: value.required,
        current_stock: value.current,
        to_purchase: Math.max(0, value.required - value.current),
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("inventory_checklist_items")
          .insert(items);

        if (itemsError) throw itemsError;
      }

      return newChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checklist", selectedDate] });
      toast({ title: "Checklist generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Approve checklist mutation (Super Admin only)
  const approveChecklistMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("inventory_checklists")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", checklist?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checklist", selectedDate] });
      toast({ title: "Checklist approved" });
    },
  });

  // Mark as purchased mutation
  const markPurchasedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("inventory_checklist_items")
        .update({ is_purchased: true })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checklist", selectedDate] });
    },
  });

  const totalToPurchase = checklist?.inventory_checklist_items?.reduce(
    (sum: number, item: any) => sum + (item.to_purchase || 0),
    0
  ) || 0;

  const purchasedCount = checklist?.inventory_checklist_items?.filter(
    (item: any) => item.is_purchased
  ).length || 0;

  const totalItems = checklist?.inventory_checklist_items?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Inventory Checklist</h1>
          <p className="text-muted-foreground">
            Generate and manage ingredient requirements for upcoming classes
          </p>
        </div>

        {/* Date Selector & Actions */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-2 bg-background"
                min={format(new Date(), "yyyy-MM-dd")}
              />
              <span className="text-sm text-muted-foreground">
                {bookingsData?.length || 0} classes scheduled
              </span>
            </div>
            <div className="flex gap-2">
              {!checklist && (
                <Button
                  onClick={() => generateChecklistMutation.mutate()}
                  disabled={generateChecklistMutation.isPending}
                  className="gap-2"
                >
                  {generateChecklistMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Generate Checklist
                </Button>
              )}
              {checklist && checklist.status === "pending" && isSuperAdmin && (
                <Button
                  onClick={() => approveChecklistMutation.mutate()}
                  disabled={approveChecklistMutation.isPending}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Checklist
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        {checklist && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                  <div className="text-2xl font-bold">{totalItems}</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-sm text-muted-foreground">To Purchase</div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {checklist.inventory_checklist_items?.filter((i: any) => i.to_purchase > 0 && !i.is_purchased).length || 0}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Purchased</div>
                  <div className="text-2xl font-bold text-green-500">{purchasedCount}</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                {checklist.status === "approved" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={checklist.status === "approved" ? "default" : "secondary"}>
                    {checklist.status === "approved" ? "Approved" : "Pending Approval"}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Checklist Table */}
        <Card className="p-6">
          {checklistLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : checklist ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Closing Stock</TableHead>
                  <TableHead>To Purchase</TableHead>
                  <TableHead>Purchased</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklist.inventory_checklist_items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.inventory?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.inventory?.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.required_quantity} {item.inventory?.unit}
                    </TableCell>
                    <TableCell>
                      <span className={item.current_stock < item.required_quantity ? "text-red-500" : ""}>
                        {item.current_stock} {item.inventory?.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.to_purchase > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.to_purchase} {item.inventory?.unit}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sufficient</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={item.is_purchased}
                        onCheckedChange={() => markPurchasedMutation.mutate(item.id)}
                        disabled={checklist.status !== "approved" || item.to_purchase === 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {(!checklist.inventory_checklist_items || checklist.inventory_checklist_items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No items in checklist. This may be because no recipe ingredients have been configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Checklist Generated</h3>
              <p className="text-muted-foreground mb-4">
                Generate a checklist to see ingredient requirements for {format(new Date(selectedDate), "MMMM d, yyyy")}
              </p>
              <Button
                onClick={() => generateChecklistMutation.mutate()}
                disabled={generateChecklistMutation.isPending}
              >
                Generate Checklist
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default InventoryChecklist;
