import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { Search, AlertTriangle, Plus, Package } from "lucide-react";

const Inventory = () => {
  const inventory = [
    {
      item: "All-Purpose Flour",
      current: 25,
      unit: "kg",
      required: 15,
      status: "ok",
    },
    {
      item: "Sugar",
      current: 8,
      unit: "kg",
      required: 12,
      status: "low",
    },
    {
      item: "Butter",
      current: 3,
      unit: "kg",
      required: 10,
      status: "critical",
    },
    {
      item: "Eggs",
      current: 120,
      unit: "pieces",
      required: 80,
      status: "ok",
    },
    {
      item: "Milk",
      current: 5,
      unit: "liters",
      required: 8,
      status: "low",
    },
    {
      item: "Chocolate Chips",
      current: 2,
      unit: "kg",
      required: 5,
      status: "critical",
    },
    {
      item: "Vanilla Extract",
      current: 500,
      unit: "ml",
      required: 200,
      status: "ok",
    },
    {
      item: "Yeast",
      current: 200,
      unit: "g",
      required: 300,
      status: "low",
    },
  ];

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

  const criticalItems = inventory.filter(item => item.status === "critical");
  const lowStockItems = inventory.filter(item => item.status === "low");

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels and tomorrow's ingredient requirements</p>
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
                <div className="text-3xl font-bold text-foreground">{inventory.length}</div>
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
                  {criticalItems.map((item, index) => (
                    <Badge key={index} variant="outline" className="border-red-500">
                      {item.item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Current Inventory vs Tomorrow's Requirements</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-10 w-64" />
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Tomorrow's Requirement</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => {
                  const percentage = (item.current / item.required) * 100;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{item.current}</span> {item.unit}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{item.required}</span> {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(item.current, item.required)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm w-12 text-right">{Math.round(percentage)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            Update
                          </Button>
                          <Button variant="outline" size="sm">
                            Order
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Tomorrow's Classes</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
              <div>
                <div className="font-semibold">Course A - Basic Baking (Morning Batch)</div>
                <div className="text-sm text-muted-foreground">12 students • Chocolate Chip Cookies</div>
              </div>
              <Badge>9:00 AM</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
              <div>
                <div className="font-semibold">Course B - Advanced Pastry (Evening Batch)</div>
                <div className="text-sm text-muted-foreground">8 students • Croissants</div>
              </div>
              <Badge>6:00 PM</Badge>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Inventory;
