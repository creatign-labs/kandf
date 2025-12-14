import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Package, Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const InventoryUsage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    inventory_id: "",
    batch_id: "",
    quantity_used: 0,
    notes: "",
  });
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
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

  // Fetch batches
  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("*, courses(title)")
        .order("time_slot");

      if (error) throw error;
      return data;
    },
  });

  // Fetch today's usage history
  const { data: usageHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["inventory-usage"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("inventory_usage")
        .select("*, inventory(name, unit), batches(batch_name, courses(title))")
        .gte("usage_date", today)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Log usage mutation
  const logUsageMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert usage record
      const { error: usageError } = await supabase.from("inventory_usage").insert({
        inventory_id: formData.inventory_id,
        batch_id: formData.batch_id || null,
        quantity_used: formData.quantity_used,
        notes: formData.notes || null,
        used_by: user.id,
      });

      if (usageError) throw usageError;

      // Update inventory stock
      const item = inventory?.find((i) => i.id === formData.inventory_id);
      if (item) {
        const newStock = Math.max(0, item.current_stock - formData.quantity_used);
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ current_stock: newStock })
          .eq("id", formData.inventory_id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-usage"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsDialogOpen(false);
      setFormData({ inventory_id: "", batch_id: "", quantity_used: 0, notes: "" });
      toast({
        title: "Usage logged",
        description: "Inventory has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const lowStockItems = inventory?.filter(
    (item) => item.current_stock <= item.reorder_level
  );

  const isLoading = inventoryLoading || historyLoading;

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Inventory Usage
          </h1>
          <p className="text-muted-foreground">
            Log ingredient usage for classes
          </p>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems && lowStockItems.length > 0 && (
          <Card className="p-4 mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                  Low Stock Alert
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lowStockItems.map((item) => (
                    <span
                      key={item.id}
                      className="text-sm bg-yellow-200 dark:bg-yellow-900 px-2 py-1 rounded"
                    >
                      {item.name}: {item.current_stock} {item.unit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Log Usage Form */}
          <Card className="p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Quick Log</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Log Usage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Inventory Usage</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Ingredient</Label>
                      <Select
                        value={formData.inventory_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, inventory_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.current_stock} {item.unit} available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Batch (Optional)</Label>
                      <Select
                        value={formData.batch_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, batch_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {batches?.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_name} - {batch.courses?.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity Used</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.quantity_used}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity_used: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes..."
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => logUsageMutation.mutate()}
                      disabled={
                        !formData.inventory_id ||
                        formData.quantity_used <= 0 ||
                        logUsageMutation.isPending
                      }
                    >
                      {logUsageMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Logging...
                        </>
                      ) : (
                        "Log Usage"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Current Stock Overview */}
            <div className="space-y-3">
              {inventory?.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.category}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      item.current_stock <= item.reorder_level
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {item.current_stock} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Usage History */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Today's Usage</h2>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageHistory?.map((usage: any) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-medium">
                        {usage.inventory?.name}
                      </TableCell>
                      <TableCell>
                        {usage.quantity_used} {usage.inventory?.unit}
                      </TableCell>
                      <TableCell>
                        {usage.batches?.batch_name || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {usage.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(usage.created_at), "h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!usageHistory || usageHistory.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No usage logged today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InventoryUsage;
