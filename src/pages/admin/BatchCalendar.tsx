import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BatchDetail {
  id: string;
  batch_date: string;
  time_slot: string;
  capacity: number;
  status: string;
  recipe: { title: string } | null;
  course: { title: string } | null;
  memberships: { student_id: string }[];
}

const BatchCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: batches, isLoading } = useQuery({
    queryKey: ["batch-calendar", format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_batches")
        .select(`
          id, batch_date, time_slot, capacity, status,
          recipe:recipe_id(title),
          course:course_id(title),
          memberships:recipe_batch_memberships(student_id)
        `)
        .gte("batch_date", format(monthStart, "yyyy-MM-dd"))
        .lte("batch_date", format(monthEnd, "yyyy-MM-dd"))
        .order("batch_date")
        .order("time_slot");
      if (error) throw error;
      return data as unknown as BatchDetail[];
    },
  });

  const batchesByDate = useMemo(() => {
    const map: Record<string, BatchDetail[]> = {};
    batches?.forEach(b => {
      if (!map[b.batch_date]) map[b.batch_date] = [];
      map[b.batch_date].push(b);
    });
    return map;
  }, [batches]);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const selectedBatches = selectedDate ? batchesByDate[selectedDate] || [] : [];

  const getStatusColor = (status: string, fill: number, capacity: number) => {
    if (status === "completed") return "bg-green-500/20 text-green-700 border-green-300";
    if (fill >= capacity) return "bg-blue-500/20 text-blue-700 border-blue-300";
    if (fill > 0) return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Batch Calendar</h1>
          <p className="text-muted-foreground">Visual overview of recipe batch scheduling</p>
        </div>

        {/* Month Navigation */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/40" /> Completed</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/40" /> Full</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/40" /> Partially Filled</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" /> Empty</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Card className="p-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[100px]" />
              ))}
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayBatches = batchesByDate[dateStr] || [];
                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "min-h-[100px] border rounded-md p-1 cursor-pointer hover:bg-accent/30 transition-colors",
                      isToday(day) && "ring-2 ring-primary",
                      !isSameMonth(day, currentMonth) && "opacity-40"
                    )}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      if (dayBatches.length > 0) setDetailOpen(true);
                    }}
                  >
                    <div className="text-xs font-medium mb-1">{format(day, "d")}</div>
                    <div className="space-y-0.5">
                      {dayBatches.slice(0, 3).map(b => {
                        const fill = b.memberships?.length || 0;
                        return (
                          <div
                            key={b.id}
                            className={cn("text-[10px] px-1 py-0.5 rounded border truncate", getStatusColor(b.status, fill, b.capacity))}
                          >
                            {b.time_slot} · {b.recipe?.title?.substring(0, 12) || "Recipe"}
                          </div>
                        );
                      })}
                      {dayBatches.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{dayBatches.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Batches on {selectedDate && format(new Date(selectedDate + "T00:00:00"), "dd MMM yyyy")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedBatches.map(b => {
                const fill = b.memberships?.length || 0;
                return (
                  <Card key={b.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{b.recipe?.title || "Recipe"}</span>
                      <Badge variant={b.status === "completed" ? "default" : "secondary"}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Course: {b.course?.title || "—"}</div>
                      <div>Time: {b.time_slot}</div>
                      <div>Capacity: {fill}/{b.capacity} students</div>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                      <div
                        className={cn("h-1.5 rounded-full", fill >= b.capacity ? "bg-blue-500" : fill > 0 ? "bg-yellow-500" : "bg-muted-foreground/30")}
                        style={{ width: `${Math.min(100, (fill / b.capacity) * 100)}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
              {selectedBatches.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No batches scheduled for this date</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BatchCalendar;
