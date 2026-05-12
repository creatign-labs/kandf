import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  ChefHat,
  Users,
  Clock,
  FileText,
  Package,
  Download,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface BatchGroup {
  timeSlot: string;
  recipeId: string | null;
  recipeTitle: string;
  courseName: string;
  courseId: string;
  students: {
    id: string;
    name: string;
    bookingId: string;
    bookingStatus: string;
  }[];
}

const Attendance = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const [attendanceState, setAttendanceState] = useState<
    Record<string, Record<string, "present" | "absent">>
  >({});
  const [confirmBatchKey, setConfirmBatchKey] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [showReport, setShowReport] = useState<string | null>(null);

  // Fetch bookings for the selected date assigned to this chef
  const { data: batches, isLoading } = useQuery({
    queryKey: ["chef-attendance-batches", dateStr],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          `
          id, student_id, course_id, recipe_id, recipe_ids, assigned_chef_id, assigned_chef_ids, time_slot, status, booking_date,
          courses(title)
        `
        )
        .eq("booking_date", dateStr)
        .or(`assigned_chef_id.eq.${user.id},assigned_chef_ids.cs.{${user.id}}`)
        .in("status", ["confirmed", "attended", "no_show"]);

      if (error) throw error;

      const allBookings = bookings || [];

      // Collect all recipe IDs across legacy + array columns
      const allRecipeIds = [
        ...new Set(
          allBookings.flatMap((b: any) => [
            ...(b.recipe_ids || []),
            ...(b.recipe_id ? [b.recipe_id] : []),
          ])
        ),
      ];
      const { data: recipesData } =
        allRecipeIds.length > 0
          ? await supabase.from("recipes").select("id, title").in("id", allRecipeIds)
          : { data: [] };
      const recipeMap = new Map((recipesData || []).map((r: any) => [r.id, r.title]));

      // Get student profiles
      const studentIds = [...new Set(allBookings.map((b) => b.student_id))];
      const { data: profiles } =
        studentIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", studentIds)
          : { data: [] };
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      // Group by time_slot + recipe — expand bookings with multiple recipes
      const grouped: Record<string, BatchGroup> = {};

      allBookings.forEach((b: any) => {
        const recipeIds: (string | null)[] =
          b.recipe_ids && b.recipe_ids.length > 0
            ? b.recipe_ids
            : [b.recipe_id || null];

        recipeIds.forEach((rid) => {
          const key = `${b.time_slot}__${rid || "none"}`;
          if (!grouped[key]) {
            grouped[key] = {
              timeSlot: b.time_slot,
              recipeId: rid,
              recipeTitle: rid ? recipeMap.get(rid) || "Recipe" : "No Recipe",
              courseName: b.courses?.title || "",
              courseId: b.course_id,
              students: [],
            };
          }
          const p = profileMap.get(b.student_id);
          // Avoid duplicate student entries within same group
          if (!grouped[key].students.find((s) => s.bookingId === b.id)) {
            grouped[key].students.push({
              id: b.student_id,
              name: p ? `${p.first_name} ${p.last_name}` : "Unknown",
              bookingId: b.id,
              bookingStatus: b.status,
            });
          }
        });
      });

      return Object.values(grouped).sort((a, b) =>
        a.timeSlot.localeCompare(b.timeSlot)
      );
    },
  });

  const getBatchLabel = (batch: BatchGroup) =>
    `${batch.recipeTitle} • ${batch.timeSlot} (${format(selectedDate, "MMM d, yyyy")})`;

  // Confirm batch completion mutation (atomic server-side RPC)
  const confirmBatchMutation = useMutation({
    mutationFn: async (batchKey: string) => {
      const batch = batches?.find(
        (_, i) => `batch-${i}` === batchKey
      );
      if (!batch) throw new Error("Batch not found in current view");

      // Safeguard: prevent re-completion
      const alreadyCompleted = batch.students.every(
        (s) => s.bookingStatus === "attended" || s.bookingStatus === "no_show"
      );
      if (alreadyCompleted) {
        throw new Error(
          `Batch "${getBatchLabel(batch)}" is already completed and cannot be confirmed again.`
        );
      }

      const batchAttendance = attendanceState[batchKey] || {};

      const confirmedStudents = batch.students.filter(
        (s) => s.bookingStatus === "confirmed"
      );
      const unmarked = confirmedStudents.filter(
        (s) => !batchAttendance[s.id]
      );
      if (unmarked.length > 0) {
        throw new Error(
          `Mark all students before confirming. ${unmarked.length} unmarked in "${getBatchLabel(batch)}".`
        );
      }

      const attendancePayload = confirmedStudents.map((s) => ({
        student_id: s.id,
        booking_id: s.bookingId,
        status: batchAttendance[s.id],
      }));

      const { data, error } = await supabase.rpc(
        "confirm_batch_completion",
        {
          p_batch_date: dateStr,
          p_time_slot: batch.timeSlot,
          p_recipe_id: batch.recipeId,
          p_attendance: attendancePayload,
          p_session_notes: sessionNotes[batchKey] || null,
        }
      );

      if (error) {
        throw new Error(
          `[${getBatchLabel(batch)}] ${error.message || "Database error"}${
            error.details ? ` — ${error.details}` : ""
          }${error.hint ? ` (Hint: ${error.hint})` : ""}`
        );
      }

      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (!result?.success) {
        throw new Error(
          `[${getBatchLabel(batch)}] ${result?.message || "Batch confirmation failed for an unknown reason"}`
        );
      }

      return batch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({
        queryKey: ["chef-attendance-batches"],
      });
      toast({
        title: "Batch Completed Successfully",
        description: `${getBatchLabel(batch)} — attendance confirmed, recipe progress updated, and inventory deducted.`,
      });
      setConfirmBatchKey(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Batch Completion Failed",
        description: error.message,
        variant: "destructive",
        duration: 10000,
      });
      setConfirmBatchKey(null);
    },
  });

  const toggleAttendance = (
    batchKey: string,
    studentId: string,
    status: "present" | "absent"
  ) => {
    setAttendanceState((prev) => ({
      ...prev,
      [batchKey]: {
        ...(prev[batchKey] || {}),
        [studentId]: status,
      },
    }));
  };

  // After-class report data
  const { data: reportData } = useQuery({
    queryKey: ["after-class-report", showReport, dateStr],
    queryFn: async () => {
      if (!showReport || !batches) return null;
      const idx = parseInt(showReport.replace("batch-", ""));
      const batch = batches[idx];
      if (!batch || !batch.recipeId) return null;

      // Get recipe ingredients
      const { data: ingredients } = await supabase
        .from("recipe_ingredients")
        .select(
          "quantity_per_student, inventory:inventory_id(name, unit)"
        )
        .eq("recipe_id", batch.recipeId);

      if (!ingredients) return null;

      const presentCount = batch.students.filter(
        (s) => s.bookingStatus === "attended"
      ).length;
      const noShowCount = batch.students.filter(
        (s) => s.bookingStatus === "no_show"
      ).length;
      const totalStudents = batch.students.length;

      const items = ingredients.map((ri: any) => ({
        name: ri.inventory?.name || "Unknown",
        unit: ri.inventory?.unit || "",
        perStudent: ri.quantity_per_student,
        totalPlanned: ri.quantity_per_student * totalStudents,
        totalUsed: ri.quantity_per_student * presentCount,
        totalUnused: ri.quantity_per_student * noShowCount,
      }));

      return {
        recipeTitle: batch.recipeTitle,
        timeSlot: batch.timeSlot,
        totalStudents,
        presentCount,
        noShowCount,
        items,
      };
    },
    enabled: !!showReport,
  });

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Attendance</h1>
            <p className="text-muted-foreground">
              Mark attendance for your assigned batches
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Batch List */}
        {(!batches || batches.length === 0) && (
          <Card className="p-8 text-center">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No batches assigned to you on{" "}
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
          </Card>
        )}

        <div className="space-y-6">
          {batches?.map((batch, idx) => {
            const batchKey = `batch-${idx}`;
            const batchAttendance = attendanceState[batchKey] || {};
            const isCompleted = batch.students.every(
              (s) =>
                s.bookingStatus === "attended" ||
                s.bookingStatus === "no_show"
            );
            const confirmedStudents = batch.students.filter(
              (s) => s.bookingStatus === "confirmed"
            );
            const allMarked =
              confirmedStudents.length > 0 &&
              confirmedStudents.every((s) => batchAttendance[s.id]);
            const presentCount = isCompleted
              ? batch.students.filter((s) => s.bookingStatus === "attended").length
              : Object.values(batchAttendance).filter((v) => v === "present").length;
            const absentCount = isCompleted
              ? batch.students.filter((s) => s.bookingStatus === "no_show").length
              : Object.values(batchAttendance).filter((v) => v === "absent").length;

            return (
              <Card
                key={batchKey}
                className={`p-4 md:p-6 ${isCompleted ? "opacity-70" : ""}`}
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <Badge variant="outline">{batch.timeSlot}</Badge>
                      {isCompleted && (
                        <Badge className="bg-green-500">Completed</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">
                      {batch.recipeTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {batch.courseName}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-green-500 font-bold text-lg">
                        {presentCount}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Present
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-bold text-lg">
                        {absentCount}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        No Show
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">
                        {batch.students.length}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Total
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student List */}
                <div className="rounded-md border mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                          Mark Attendance
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.students.map((student) => {
                        const currentMark = batchAttendance[student.id];
                        const alreadyProcessed =
                          student.bookingStatus === "attended" ||
                          student.bookingStatus === "no_show";

                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>
                              {alreadyProcessed ? (
                                <Badge
                                  className={
                                    student.bookingStatus === "attended"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }
                                >
                                  {student.bookingStatus === "attended"
                                    ? "Present"
                                    : "No Show"}
                                </Badge>
                              ) : currentMark ? (
                                <Badge
                                  className={
                                    currentMark === "present"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }
                                >
                                  {currentMark === "present"
                                    ? "Present"
                                    : "No Show"}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  Not Marked
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!alreadyProcessed && !isCompleted && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant={
                                      currentMark === "present"
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      currentMark === "present"
                                        ? "bg-green-500 hover:bg-green-600"
                                        : ""
                                    }
                                    onClick={() =>
                                      toggleAttendance(
                                        batchKey,
                                        student.id,
                                        "present"
                                      )
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Present
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      currentMark === "absent"
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      currentMark === "absent"
                                        ? "bg-red-500 hover:bg-red-600"
                                        : ""
                                    }
                                    onClick={() =>
                                      toggleAttendance(
                                        batchKey,
                                        student.id,
                                        "absent"
                                      )
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    No Show
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Session Notes */}
                {!isCompleted && (
                  <div className="mb-4">
                    <Textarea
                      placeholder="Session notes (optional): issues, observations..."
                      value={sessionNotes[batchKey] || ""}
                      onChange={(e) =>
                        setSessionNotes((prev) => ({
                          ...prev,
                          [batchKey]: e.target.value,
                        }))
                      }
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isCompleted ? (
                    <Button
                      className="flex-1"
                      disabled={
                        !allMarked || confirmBatchMutation.isPending
                      }
                      onClick={() => setConfirmBatchKey(batchKey)}
                    >
                      {confirmBatchMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />{" "}
                          Confirm Batch Completion
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      variant="outline"
                      disabled
                      title="This batch has already been completed"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Already Completed
                    </Button>
                  )}

                  {isCompleted && batch.recipeId && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setShowReport(batchKey)}
                    >
                      <FileText className="h-4 w-4" />
                      After-Class Report
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmBatchKey}
        onOpenChange={(open) => {
          if (!open && !confirmBatchMutation.isPending) setConfirmBatchKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Batch Completion</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {(() => {
                  if (!confirmBatchKey || !batches) return null;
                  const idx = parseInt(confirmBatchKey.replace("batch-", ""));
                  const batch = batches[idx];
                  if (!batch) return null;
                  const ba = attendanceState[confirmBatchKey] || {};
                  const present = Object.values(ba).filter((v) => v === "present").length;
                  const absent = Object.values(ba).filter((v) => v === "absent").length;
                  return (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm text-foreground">
                      <div className="font-medium">{batch.recipeTitle}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {batch.timeSlot} • {format(selectedDate, "MMM d, yyyy")}
                      </div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-green-600">Present: {present}</span>
                        <span className="text-red-500">No Show: {absent}</span>
                        <span className="text-muted-foreground">Total: {batch.students.length}</span>
                      </div>
                    </div>
                  );
                })()}
                <span className="block text-sm text-muted-foreground">
                  Are you sure you want to mark this batch as completed? This will
                  finalize attendance, update recipe progress, deduct inventory for
                  present students, and apply no-show rules. This action cannot be undone.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmBatchMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmBatchMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmBatchKey) confirmBatchMutation.mutate(confirmBatchKey);
              }}
            >
              {confirmBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Yes, Mark Completed"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* After-Class Report Dialog */}
      <AlertDialog
        open={!!showReport}
        onOpenChange={() => setShowReport(null)}
      >
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              After-Class Report
            </AlertDialogTitle>
          </AlertDialogHeader>

          {reportData ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">
                    {reportData.totalStudents}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Students
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {reportData.presentCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Attended
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {reportData.noShowCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    No Show
                  </div>
                </Card>
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>{reportData.recipeTitle}</strong> •{" "}
                {reportData.timeSlot} •{" "}
                {format(selectedDate, "MMM d, yyyy")}
              </div>

              {/* Ingredient Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">
                        Total Planned
                      </TableHead>
                      <TableHead className="text-right">
                        Used (Attended)
                      </TableHead>
                      <TableHead className="text-right">
                        Unused (No Show)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalPlanned.toFixed(1)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {item.totalUsed.toFixed(1)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {item.totalUnused.toFixed(1)} {item.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Attendance;
