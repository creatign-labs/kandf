import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar as CalendarIcon, 
  Users, 
  ChefHat, 
  Loader2, 
  ArrowRightLeft,
  UserMinus,
  History,
  AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useRecipeBatches,
  useRecipeBatchMembers,
  useMoveStudentBatch,
  useRemoveStudentFromBatch,
  useRecipeBatchAuditLog,
  useSameDateRecipeBatches
} from "@/hooks/useAdminRecipeBatches";

const RecipeBatchManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    fromBatchId: string;
    recipeId: string;
    batchDate: string;
  } | null>(null);
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    batchId: string;
  } | null>(null);
  const [moveReason, setMoveReason] = useState("");
  const [targetBatchId, setTargetBatchId] = useState<string>("");

  // Fetch courses for filter
  const { data: courses } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  const { data: batches, isLoading: batchesLoading } = useRecipeBatches(
    selectedDate,
    courseFilter !== 'all' ? courseFilter : undefined
  );
  const { data: members, isLoading: membersLoading } = useRecipeBatchMembers(selectedBatch);
  const { data: auditLogs, isLoading: auditLoading } = useRecipeBatchAuditLog();
  const { data: sameDateBatches } = useSameDateRecipeBatches(
    moveDialog?.recipeId || null,
    moveDialog?.batchDate || null,
    moveDialog?.fromBatchId
  );

  const moveMutation = useMoveStudentBatch();
  const removeMutation = useRemoveStudentFromBatch();

  const selectedBatchData = batches?.find(b => b.id === selectedBatch);

  const handleMove = () => {
    if (!moveDialog || !targetBatchId) return;
    moveMutation.mutate({
      studentId: moveDialog.studentId,
      fromBatchId: moveDialog.fromBatchId,
      toBatchId: targetBatchId,
      reason: moveReason || undefined
    }, {
      onSuccess: () => {
        setMoveDialog(null);
        setMoveReason("");
        setTargetBatchId("");
      }
    });
  };

  const handleRemove = () => {
    if (!removeDialog) return;
    removeMutation.mutate({
      studentId: removeDialog.studentId,
      batchId: removeDialog.batchId,
      reason: moveReason || undefined
    }, {
      onSuccess: () => {
        setRemoveDialog(null);
        setMoveReason("");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Recipe Batch Management</h1>
          <p className="text-muted-foreground">
            View and manage recipe-based student groupings with manual override capabilities
          </p>
        </div>

        <Tabs defaultValue="batches" className="space-y-6">
          <TabsList>
            <TabsTrigger value="batches" className="gap-2">
              <Users className="h-4 w-4" />
              Recipe Batches
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Recipe Batches Tab */}
          <TabsContent value="batches" className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "All dates"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                      {selectedDate && (
                        <div className="p-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedDate(undefined)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Course</label>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All courses</SelectItem>
                      {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Batch List */}
              <div className="lg:col-span-1">
                <Card className="p-4">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Recipe Batches
                  </h2>
                  
                  {batchesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : batches && batches.length > 0 ? (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {batches.map((batch) => (
                        <button
                          key={batch.id}
                          onClick={() => setSelectedBatch(batch.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            selectedBatch === batch.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {batch.recipes?.title}
                            </span>
                            {batch.is_manually_adjusted && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>{format(new Date(batch.batch_date), 'MMM d, yyyy')}</div>
                            <div>{batch.time_slot}</div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {batch.member_count} / {batch.capacity}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recipe batches found
                    </p>
                  )}
                </Card>
              </div>

              {/* Batch Details */}
              <Card className="lg:col-span-2 p-6">
                {selectedBatch && selectedBatchData ? (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          {selectedBatchData.recipes?.title}
                          {selectedBatchData.is_manually_adjusted && (
                            <Badge variant="secondary">Manually Adjusted</Badge>
                          )}
                        </h2>
                        <p className="text-muted-foreground">
                          {selectedBatchData.courses?.title} • {format(new Date(selectedBatchData.batch_date), 'MMMM d, yyyy')} • {selectedBatchData.time_slot}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {selectedBatchData.member_count} / {selectedBatchData.capacity}
                        </div>
                        <p className="text-sm text-muted-foreground">Students</p>
                      </div>
                    </div>

                    {membersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : members && members.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Assigned At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.profile?.first_name} {member.profile?.last_name}
                                <div className="text-xs text-muted-foreground">
                                  {member.profile?.email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={member.is_manual_assignment ? "secondary" : "outline"}>
                                  {member.is_manual_assignment ? "Manual" : "Auto"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(member.assigned_at), 'MMM d, h:mm a')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMoveDialog({
                                      open: true,
                                      studentId: member.student_id,
                                      studentName: `${member.profile?.first_name} ${member.profile?.last_name}`,
                                      fromBatchId: selectedBatch,
                                      recipeId: selectedBatchData.recipe_id,
                                      batchDate: selectedBatchData.batch_date
                                    })}
                                  >
                                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                                    Move
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setRemoveDialog({
                                      open: true,
                                      studentId: member.student_id,
                                      studentName: `${member.profile?.first_name} ${member.profile?.last_name}`,
                                      batchId: selectedBatch
                                    })}
                                  >
                                    <UserMinus className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No students in this batch
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a batch to view details</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Manual Override Audit Log
              </h2>

              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Recipe</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.action === 'remove' ? 'destructive' : 
                            log.action === 'move' ? 'secondary' : 'default'
                          }>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.student_profile?.first_name} {log.student_profile?.last_name}
                        </TableCell>
                        <TableCell>{log.recipe?.title}</TableCell>
                        <TableCell>
                          {log.actor_profile?.first_name} {log.actor_profile?.last_name}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No audit logs found
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Move Dialog */}
        <Dialog open={!!moveDialog} onOpenChange={() => setMoveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Student to Another Batch</DialogTitle>
              <DialogDescription>
                Move {moveDialog?.studentName} to a different time slot for the same recipe.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Students can only be moved between batches of the <strong>same recipe</strong>.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Target Batch</label>
                <Select value={targetBatchId} onValueChange={setTargetBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {sameDateBatches?.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.time_slot} ({batch.member_count}/{batch.capacity} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sameDateBatches?.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No other batches available for this recipe on this date.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
                <Textarea
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Enter reason for this change..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveDialog(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMove} 
                disabled={!targetBatchId || moveMutation.isPending}
              >
                {moveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Moving...</>
                ) : (
                  'Move Student'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Dialog */}
        <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Student from Batch</DialogTitle>
              <DialogDescription>
                This will remove {removeDialog?.studentName} from this batch and cancel their booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
                <Textarea
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Enter reason for removal..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDialog(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRemove} 
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</>
                ) : (
                  'Remove Student'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RecipeBatchManagement;
