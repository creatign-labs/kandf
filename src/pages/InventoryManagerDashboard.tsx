import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Search, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Item = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  reorder_level: number;
};

const emptyNew = { name: "", category: "", unit: "", current_stock: "", reorder_level: "" };

const InventoryManagerDashboard = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(emptyNew);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["im-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, category, unit, current_stock, reorder_level")
        .order("name");
      if (error) throw error;
      return (data || []) as Item[];
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase.from("inventory").update({ current_stock: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      setEdits((p) => { const n = { ...p }; delete n[v.id]; return n; });
      qc.invalidateQueries({ queryKey: ["im-inventory"] });
      toast({ title: "Closing Stock updated" });
    },
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory").insert({
        name: newItem.name.trim(),
        category: newItem.category.trim() || null,
        unit: newItem.unit.trim(),
        current_stock: Number(newItem.current_stock) || 0,
        reorder_level: Number(newItem.reorder_level) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddOpen(false);
      setNewItem(emptyNew);
      qc.invalidateQueries({ queryKey: ["im-inventory"] });
      toast({ title: "Item added" });
    },
    onError: (e: Error) => toast({ title: "Could not add item", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter((i) =>
    `${i.name} ${i.category || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const lowCount = items.filter((i) => Number(i.current_stock) <= Number(i.reorder_level)).length;

  return (
    <div className="min-h-screen bg-background">
      <Header role="inventory_manager" />
      <div className="container px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-muted-foreground text-sm">View and update Closing Stock</p>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div><p className="text-sm text-muted-foreground">Total Items</p><p className="text-xl font-bold">{items.length}</p></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-xl font-bold">{lowCount}</p></div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No items found.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((i) => {
              const low = Number(i.current_stock) <= Number(i.reorder_level);
              const edit = edits[i.id];
              return (
                <Card key={i.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.category || "Uncategorised"} · Reorder at {i.reorder_level} {i.unit}
                    </p>
                    {low && <Badge variant="destructive" className="mt-1">Low stock</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Closing Stock</Label>
                    <Input
                      type="number"
                      className="w-24"
                      value={edit ?? String(i.current_stock)}
                      onChange={(e) => { const v = e.target.value; setEdits((p) => ({ ...p, [i.id]: v })); }}
                    />
                    <span className="text-sm text-muted-foreground">{i.unit}</span>
                    <Button
                      size="sm"
                      disabled={edit === undefined || edit === "" || updateStock.isPending}
                      onClick={() => updateStock.mutate({ id: i.id, value: Number(edit) })}
                    >Save</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([
              ["name", "Name", "text"],
              ["category", "Category", "text"],
              ["unit", "Unit (e.g. kg, g, l)", "text"],
              ["current_stock", "Closing Stock", "number"],
              ["reorder_level", "Reorder Level", "number"],
            ] as const).map(([key, label, type]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type={type}
                  maxLength={100}
                  value={newItem[key]}
                  onChange={(e) => { const v = e.target.value; setNewItem((p) => ({ ...p, [key]: v })); }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={!newItem.name.trim() || !newItem.unit.trim() || addItem.isPending}
              onClick={() => addItem.mutate()}
            >Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagerDashboard;
