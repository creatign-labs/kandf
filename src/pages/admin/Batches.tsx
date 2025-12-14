import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users, Calendar, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Batches = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [formData, setFormData] = useState({
    batch_name: "",
    course_id: "",
    time_slot: "",
    days: "",
    total_seats: 30,
    start_date: "",
  });
  const queryClient = useQueryClient();

  // Fetch batches with course info and enrollment counts
  const { data: batches, isLoading } = useQuery({
    queryKey: ["admin-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("*, courses(id, title)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get enrollment counts for each batch
      const batchesWithCounts = await Promise.all(
        (data || []).map(async (batch) => {
          const { count } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", batch.id)
            .eq("status", "active");

          return { ...batch, enrolled_count: count || 0 };
        })
      );

      return batchesWithCounts;
    },
  });

  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingBatch) {
        const { error } = await supabase
          .from("batches")
          .update({
            batch_name: formData.batch_name,
            course_id: formData.course_id,
            time_slot: formData.time_slot,
            days: formData.days,
            total_seats: formData.total_seats,
            available_seats: formData.total_seats - (editingBatch.enrolled_count || 0),
            start_date: formData.start_date || null,
          })
          .eq("id", editingBatch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("batches").insert({
          batch_name: formData.batch_name,
          course_id: formData.course_id,
          time_slot: formData.time_slot,
          days: formData.days,
          total_seats: formData.total_seats,
          available_seats: formData.total_seats,
          start_date: formData.start_date || null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: editingBatch ? "Batch updated" : "Batch created",
        description: editingBatch
          ? "The batch has been updated successfully."
          : "New batch has been created.",
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("batches")
        .delete()
        .eq("id", batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      toast({ title: "Batch deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      batch_name: "",
      course_id: "",
      time_slot: "",
      days: "",
      total_seats: 30,
      start_date: "",
    });
    setEditingBatch(null);
  };

  const handleEdit = (batch: any) => {
    setEditingBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      course_id: batch.course_id,
      time_slot: batch.time_slot,
      days: batch.days,
      total_seats: batch.total_seats,
      start_date: batch.start_date || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (batchId: string, enrolledCount: number) => {
    if (enrolledCount > 0) {
      toast({
        title: "Cannot delete",
        description: "This batch has enrolled students.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("Are you sure you want to delete this batch?")) {
      deleteMutation.mutate(batchId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Batch Management
          </h1>
          <p className="text-muted-foreground">
            Manage class batches and schedules
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Total Batches
                </div>
                <div className="text-3xl font-bold">{batches?.length || 0}</div>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Total Enrolled
                </div>
                <div className="text-3xl font-bold">
                  {batches?.reduce((sum, b) => sum + (b.enrolled_count || 0), 0) || 0}
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Available Seats
                </div>
                <div className="text-3xl font-bold text-green-500">
                  {batches?.reduce((sum, b) => sum + (b.available_seats || 0), 0) || 0}
                </div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Add Batch Button & Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">All Batches</h2>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBatch ? "Edit Batch" : "Create New Batch"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select
                      value={formData.course_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, course_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch_name">Batch Name</Label>
                    <Input
                      id="batch_name"
                      placeholder="e.g., Morning Batch A"
                      value={formData.batch_name}
                      onChange={(e) =>
                        setFormData({ ...formData, batch_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time_slot">Time Slot</Label>
                      <Input
                        id="time_slot"
                        placeholder="e.g., 9:00 AM - 12:00 PM"
                        value={formData.time_slot}
                        onChange={(e) =>
                          setFormData({ ...formData, time_slot: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="days">Days</Label>
                      <Input
                        id="days"
                        placeholder="e.g., Mon, Wed, Fri"
                        value={formData.days}
                        onChange={(e) =>
                          setFormData({ ...formData, days: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total_seats">Total Seats</Label>
                      <Input
                        id="total_seats"
                        type="number"
                        value={formData.total_seats}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_seats: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, start_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => saveMutation.mutate()}
                    disabled={
                      !formData.batch_name ||
                      !formData.course_id ||
                      !formData.time_slot ||
                      saveMutation.isPending
                    }
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editingBatch ? (
                      "Update Batch"
                    ) : (
                      "Create Batch"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches?.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      {batch.batch_name}
                    </TableCell>
                    <TableCell>{batch.courses?.title}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{batch.time_slot}</div>
                        <div className="text-muted-foreground">{batch.days}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          batch.available_seats === 0 ? "destructive" : "secondary"
                        }
                      >
                        {batch.enrolled_count}/{batch.total_seats}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {batch.start_date
                        ? format(new Date(batch.start_date), "MMM d, yyyy")
                        : "Not set"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(batch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleDelete(batch.id, batch.enrolled_count)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!batches || batches.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No batches created yet
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

export default Batches;
