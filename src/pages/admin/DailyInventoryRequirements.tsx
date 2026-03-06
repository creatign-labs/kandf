import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Clock, Loader2, RefreshCw, ShoppingCart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const DailyInventoryRequirements = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
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

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch existing requirement for selected date
  const { data: requirement, isLoading: requirementLoading } = useQuery({
    queryKey: ["daily-inventory-requirement", formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_inventory_requirements")
        .select("*")
        .eq("requirement_date", formattedDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch requirement items if requirement exists
  const { data: requirementItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["daily-inventory-requirement-items", requirement?.id],
    queryFn: async () => {
      if (!requirement) return [];
      const { data, error } = await supabase
        .from("daily_inventory_requirement_items")
        .select(`
          *,
          inventory:inventory_id(name, unit, category),
          recipe:recipe_id(title)
        `)
        .eq("requirement_id", requirement.id);

      if (error) throw error;
      return data;
    },
    enabled: !!requirement,
  });

  // Fetch bookings count for selected date
  const { data: bookingsCount } = useQuery({
    queryKey: ["bookings-count", formattedDate],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("booking_date", formattedDate)
        .eq("status", "confirmed");

      if (error) throw error;
      return count || 0;
    },
  });

  // Generate requirement mutation - calls backend RPC
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_daily_inventory_requirements", {
        p_date: formattedDate,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-inventory-requirement", formattedDate] });
      toast({
        title: "Checklist Generated",
        description: "Inventory requirements have been calculated from bookings.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Approve requirement mutation - calls backend RPC (super_admin only)
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!requirement) throw new Error("No requirement to approve");
      
      const { error } = await supabase.rpc("approve_inventory_checklist", {
        p_requirement_id: requirement.id,
        p_notes: null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-inventory-requirement", formattedDate] });
      toast({
        title: "Checklist Approved",
        description: "Admin can now proceed with purchasing.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mark item as purchased mutation (admin only, after approval)
  const markPurchasedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("daily_inventory_requirement_items")
        .update({ is_purchased: true })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-inventory-requirement-items", requirement?.id] });
      toast({ title: "Item marked as purchased" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = requirementLoading || itemsLoading;

  const totalItems = requirementItems?.length || 0;
  const purchasedCount = requirementItems?.filter(item => item.is_purchased).length || 0;
  const totalToPurchase = requirementItems?.reduce((sum, item) => sum + (item.to_purchase || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "purchased":
        return <Badge className="bg-blue-500">Purchased</Badge>;
      default:
        return <Badge variant="secondary">Pending Approval</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Daily Inventory Requirements</h1>
          <p className="text-muted-foreground">
            Generate and manage inventory requirements based on bookings
          </p>
        </div>

        {/* Date Selection & Actions */}
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
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
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Badge variant="outline" className="text-sm">
                {bookingsCount} Bookings
              </Badge>
            </div>

            <div className="flex gap-2">
              {!requirement && (
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || bookingsCount === 0}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Generate Checklist
                </Button>
              )}

              {requirement && requirement.status === "pending" && isSuperAdmin && (
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve Checklist
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        {requirement && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-1">{getStatusBadge(requirement.status)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Purchased</div>
              <div className="text-2xl font-bold text-green-500">{purchasedCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Items to Purchase</div>
              <div className="text-2xl font-bold text-yellow-500">
                {totalItems - purchasedCount}
              </div>
            </Card>
          </div>
        )}

        {/* Requirements Table */}
        <Card className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !requirement ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No checklist for this date</p>
              <p className="text-sm">
                {bookingsCount === 0
                  ? "No bookings for this date yet."
                  : "Click 'Generate Checklist' to calculate requirements."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Closing Stock</TableHead>
                  <TableHead className="text-right">To Purchase</TableHead>
                  <TableHead>Status</TableHead>
                  {requirement.status === "approved" && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirementItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.inventory?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.inventory?.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.recipe?.title || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.required_quantity} {item.inventory?.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.current_stock} {item.inventory?.unit}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {item.to_purchase > 0 ? (
                        <span className="text-yellow-600">
                          {item.to_purchase} {item.inventory?.unit}
                        </span>
                      ) : (
                        <span className="text-green-600">In Stock</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.is_purchased ? (
                        <Badge className="bg-green-500">Purchased</Badge>
                      ) : item.to_purchase > 0 ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </TableCell>
                    {requirement.status === "approved" && (
                      <TableCell>
                        {!item.is_purchased && item.to_purchase > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPurchasedMutation.mutate(item.id)}
                            disabled={markPurchasedMutation.isPending}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Mark Purchased
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!requirementItems || requirementItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No ingredients required for this date
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
};

export default DailyInventoryRequirements;
