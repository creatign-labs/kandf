import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2, Package, Plus, Truck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExportButton } from "@/components/ExportButton";

const PurchaseOrders = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ inventory_id: string; quantity: number; unit_cost: number }[]>([]);
  const queryClient = useQueryClient();

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
      return !!data;
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("id, name, unit, category").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["all-po-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*, inventory:inventory_id(name, unit)");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalAmount = selectedItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

      const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({ vendor_name: vendorName, notes, total_amount: totalAmount, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      const items = selectedItems.map(i => ({
        purchase_order_id: po.id,
        inventory_id: i.inventory_id,
        ordered_quantity: i.quantity,
        received_quantity: i.quantity,
        unit_cost: i.unit_cost,
      }));

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["all-po-items"] });
      setCreateOpen(false);
      setVendorName("");
      setNotes("");
      setSelectedItems([]);
      toast({ title: "Purchase Order Created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (poId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "PO Approved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const receiveMutation = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase.rpc("receive_purchase_order", { p_po_id: poId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "PO Received", description: "Stock-in ledger entries created automatically." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addItem = () => {
    setSelectedItems([...selectedItems, { inventory_id: "", quantity: 1, unit_cost: 0 }]);
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...selectedItems];
    (updated[idx] as any)[field] = value;
    setSelectedItems(updated);
  };

  const removeItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { draft: "secondary", approved: "default", received: "outline" };
    const colors: Record<string, string> = { draft: "", approved: "bg-green-500", received: "bg-blue-500" };
    return <Badge className={colors[status] || ""} variant={map[status] as any || "secondary"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const exportData = orders?.map(o => ({
    Vendor: o.vendor_name,
    Amount: o.total_amount,
    Status: o.status,
    Created: format(new Date(o.created_at), "yyyy-MM-dd"),
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Purchase Orders</h1>
            <p className="text-muted-foreground">Create, approve, and receive purchase orders</p>
          </div>
          <div className="flex gap-2">
            <ExportButton data={exportData} filename="purchase-orders" />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create PO</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Vendor Name" value={vendorName} onChange={e => setVendorName(e.target.value)} />
                  <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Items</h4>
                      <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                    </div>
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-center">
                        <Select value={item.inventory_id} onValueChange={v => updateItem(idx, "inventory_id", v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                          <SelectContent>
                            {inventory?.map(inv => (
                              <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Qty" className="w-20" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                        <Input type="number" placeholder="Cost" className="w-24" value={item.unit_cost} onChange={e => updateItem(idx, "unit_cost", Number(e.target.value))} />
                        <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>×</Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!vendorName || selectedItems.length === 0 || createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Purchase Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map(po => {
                  const items = orderItems?.filter(i => i.purchase_order_id === po.id) || [];
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.vendor_name}</TableCell>
                      <TableCell>₹{Number(po.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {items.map(i => (
                            <div key={i.id}>{i.inventory?.name}: {i.ordered_quantity} {i.inventory?.unit}</div>
                          ))}
                          {items.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(po.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {po.status === "draft" && isSuperAdmin && (
                            <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(po.id)} disabled={approveMutation.isPending}>
                              <CheckCircle className="h-3 w-3 mr-1" />Approve
                            </Button>
                          )}
                          {po.status === "approved" && (
                            <Button size="sm" variant="outline" onClick={() => receiveMutation.mutate(po.id)} disabled={receiveMutation.isPending}>
                              <Truck className="h-3 w-3 mr-1" />Receive
                            </Button>
                          )}
                          {po.status === "received" && (
                            <Badge variant="outline" className="text-green-600"><Package className="h-3 w-3 mr-1" />Complete</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!orders || orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell>
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

export default PurchaseOrders;
