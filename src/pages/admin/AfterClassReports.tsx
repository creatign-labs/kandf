import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2, Download, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { getDetailedErrorMessage } from "@/lib/errors";

interface SessionReport {
  key: string;
  date: string;
  timeSlot: string;
  recipeId: string | null;
  recipeTitle: string;
  courseTitle: string;
  chefNames: string[];
  total: number;
  attended: number;
  noShow: number;
  sessionNotes: string | null;
}

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCsv = (lines: string[], filename: string) => {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const AfterClassReports = () => {
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ["admin-after-class-reports", fromDate, toDate],
    queryFn: async (): Promise<SessionReport[]> => {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          "id, student_id, course_id, recipe_id, recipe_ids, assigned_chef_id, assigned_chef_ids, time_slot, booking_date, status, courses(title)"
        )
        .gte("booking_date", fromDate)
        .lte("booking_date", toDate)
        .in("status", ["attended", "no_show"]);

      if (bookingsError) throw new Error(await getDetailedErrorMessage(bookingsError));

      const rows = bookings || [];
      if (rows.length === 0) return [];

      const recipeIds = [
        ...new Set(
          rows.flatMap((b: any) => [...(b.recipe_ids || []), ...(b.recipe_id ? [b.recipe_id] : [])])
        ),
      ];
      const { data: recipes } = recipeIds.length
        ? await supabase.from("recipes").select("id, title").in("id", recipeIds)
        : { data: [] };
      const recipeMap = new Map((recipes || []).map((r: any) => [r.id, r.title]));

      const chefIds = [
        ...new Set(
          rows.flatMap((b: any) => [
            ...(b.assigned_chef_ids || []),
            ...(b.assigned_chef_id ? [b.assigned_chef_id] : []),
          ])
        ),
      ];
      const { data: chefs } = chefIds.length
        ? await supabase.from("profiles").select("id, first_name, last_name").in("id", chefIds)
        : { data: [] };
      const chefMap = new Map(
        (chefs || []).map((c: any) => [c.id, `${c.first_name} ${c.last_name}`.trim()])
      );

      const { data: recipeBatches } = await supabase
        .from("recipe_batches")
        .select("recipe_id, batch_date, time_slot, session_notes")
        .gte("batch_date", fromDate)
        .lte("batch_date", toDate);
      const notesMap = new Map(
        (recipeBatches || []).map((rb: any) => [
          `${rb.batch_date}__${rb.time_slot}__${rb.recipe_id}`,
          rb.session_notes,
        ])
      );

      const grouped: Record<string, SessionReport> = {};
      rows.forEach((b: any) => {
        const rIds: (string | null)[] =
          b.recipe_ids && b.recipe_ids.length > 0 ? b.recipe_ids : [b.recipe_id || null];
        rIds.forEach((rid) => {
          const key = `${b.booking_date}__${b.time_slot}__${rid || "none"}`;
          if (!grouped[key]) {
            grouped[key] = {
              key,
              date: b.booking_date,
              timeSlot: b.time_slot,
              recipeId: rid,
              recipeTitle: rid ? recipeMap.get(rid) || "Recipe" : "No Recipe",
              courseTitle: b.courses?.title || "—",
              chefNames: [],
              total: 0,
              attended: 0,
              noShow: 0,
              sessionNotes: notesMap.get(`${b.booking_date}__${b.time_slot}__${rid}`) || null,
            };
          }
          const g = grouped[key];
          g.total += 1;
          if (b.status === "attended") g.attended += 1;
          if (b.status === "no_show") g.noShow += 1;
          const bookingChefs = [
            ...(b.assigned_chef_ids || []),
            ...(b.assigned_chef_id ? [b.assigned_chef_id] : []),
          ];
          bookingChefs.forEach((cid: string) => {
            const name = chefMap.get(cid);
            if (name && !g.chefNames.includes(name)) g.chefNames.push(name);
          });
        });
      });

      return Object.values(grouped).sort(
        (a, b) => b.date.localeCompare(a.date) || a.timeSlot.localeCompare(b.timeSlot)
      );
    },
  });

  const downloadSession = async (s: SessionReport) => {
    try {
      const lines: string[] = [];
      lines.push("After-Class Report");
      lines.push(`Date,${s.date}`);
      lines.push(`Course,${esc(s.courseTitle)}`);
      lines.push(`Recipe,${esc(s.recipeTitle)}`);
      lines.push(`Time Slot,${esc(s.timeSlot)}`);
      lines.push(`Chef(s),${esc(s.chefNames.join(" / ") || "Unassigned")}`);
      lines.push(`Total Students,${s.total}`);
      lines.push(`Attended,${s.attended}`);
      lines.push(`No Show,${s.noShow}`);
      lines.push(`Session Notes,${esc(s.sessionNotes || "")}`);

      if (s.recipeId) {
        const { data: ingredients, error: ingErr } = await supabase
          .from("recipe_ingredients")
          .select("quantity_per_student, inventory:inventory_id(name, unit)")
          .eq("recipe_id", s.recipeId);
        if (ingErr) throw new Error(await getDetailedErrorMessage(ingErr));
        lines.push("");
        lines.push(
          "Ingredient,Unit,Per Student,Total Planned,Used (Attended),Unused (No Show)"
        );
        (ingredients || []).forEach((ri: any) => {
          const per = Number(ri.quantity_per_student) || 0;
          lines.push(
            [
              ri.inventory?.name || "Unknown",
              ri.inventory?.unit || "",
              per,
              (per * s.total).toFixed(2),
              (per * s.attended).toFixed(2),
              (per * s.noShow).toFixed(2),
            ]
              .map(esc)
              .join(",")
          );
        });
      }

      const safe = `${s.recipeTitle}`.replace(/[^a-z0-9]+/gi, "_");
      downloadCsv(lines, `after_class_report_${safe}_${s.date}.csv`);
      toast({ title: "Report downloaded" });
    } catch (e) {
      toast({
        title: "Could not download report",
        description: `Reason: ${(e as Error).message}`,
        variant: "destructive",
        duration: 12000,
      });
    }
  };

  const downloadAll = () => {
    if (!sessions || sessions.length === 0) return;
    const lines: string[] = [];
    lines.push(`After-Class Reports,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("Date,Course,Recipe,Time Slot,Chef(s),Total,Attended,No Show,Session Notes");
    sessions.forEach((s) =>
      lines.push(
        [
          s.date,
          s.courseTitle,
          s.recipeTitle,
          s.timeSlot,
          s.chefNames.join(" / ") || "Unassigned",
          s.total,
          s.attended,
          s.noShow,
          s.sessionNotes || "",
        ]
          .map(esc)
          .join(",")
      )
    );
    downloadCsv(lines, `after_class_reports_${fromDate}_to_${toDate}.csv`);
    toast({ title: "Reports downloaded" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">After-Class Reports</h1>
            </div>
            <p className="text-muted-foreground">
              Date-wise and class-wise logs of every completed class, with attendance and
              ingredient consumption.
            </p>
          </div>
          <Button onClick={downloadAll} disabled={!sessions || sessions.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <p className="text-destructive font-medium">Could not load after-class reports</p>
            <p className="text-sm text-muted-foreground mt-1">Reason: {(error as Error).message}</p>
          </Card>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No completed classes in this date range</p>
            <p className="text-sm text-muted-foreground">
              Reports appear here once a chef marks a class as completed.
            </p>
          </Card>
        ) : (
          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Chef(s)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                  <TableHead className="text-right">No Show</TableHead>
                  <TableHead>Session Notes</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(`${s.date}T00:00:00`), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{s.courseTitle}</TableCell>
                    <TableCell className="font-medium">{s.recipeTitle}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.timeSlot}</TableCell>
                    <TableCell>{s.chefNames.join(", ") || <Badge variant="outline">Unassigned</Badge>}</TableCell>
                    <TableCell className="text-right">{s.total}</TableCell>
                    <TableCell className="text-right text-green-600">{s.attended}</TableCell>
                    <TableCell className="text-right text-destructive">{s.noShow}</TableCell>
                    <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                      {s.sessionNotes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadSession(s)}>
                        <Download className="h-4 w-4" />
                        CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AfterClassReports;
