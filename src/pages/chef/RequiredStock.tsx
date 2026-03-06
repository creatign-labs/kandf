import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Loader2, AlertTriangle, Search, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const RequiredStock = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch inventory items (read-only)
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory-readonly"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Get unique categories
  const categories = [...new Set(inventory?.map((item) => item.category) || [])];

  // Filter inventory
  const filteredInventory = inventory?.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stock status
  const lowStockItems = inventory?.filter(
    (item) => item.current_stock <= item.reorder_level
  );
  const outOfStockItems = inventory?.filter((item) => item.current_stock === 0);
  const adequateStockItems = inventory?.filter(
    (item) => item.current_stock > item.reorder_level
  );

  const getStockStatus = (item: { current_stock: number; reorder_level: number }) => {
    if (item.current_stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (item.current_stock <= item.reorder_level) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

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
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Required Stock</h1>
            <p className="text-muted-foreground">
              View current inventory levels (read-only)
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inventory?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {adequateStockItems?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">In Stock</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">
                  {lowStockItems?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {outOfStockItems?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems && lowStockItems.length > 0 && (
          <Card className="p-4 mb-6 border-yellow-500/50 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                  Low Stock Alert
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lowStockItems.slice(0, 10).map((item) => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                    >
                      {item.name}: {item.current_stock} {item.unit}
                    </Badge>
                  ))}
                  {lowStockItems.length > 10 && (
                    <Badge variant="outline">+{lowStockItems.length - 10} more</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Closing Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory?.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            item.current_stock <= item.reorder_level
                              ? "text-destructive font-medium"
                              : ""
                          }
                        >
                          {item.current_stock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.reorder_level} {item.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant === "success" ? "default" : status.variant === "warning" ? "secondary" : "destructive"}
                          className={
                            status.variant === "success"
                              ? "bg-green-500 hover:bg-green-600"
                              : status.variant === "warning"
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : ""
                          }
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!filteredInventory || filteredInventory.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No ingredients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default RequiredStock;
