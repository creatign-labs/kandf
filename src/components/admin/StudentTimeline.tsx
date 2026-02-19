import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CreditCard, BookOpen, ClipboardList, MessageSquare, Briefcase, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface StudentTimelineProps {
  studentId: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const StudentTimeline = ({ studentId }: StudentTimelineProps) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["student-timeline", studentId],
    queryFn: async () => {
      const timeline: TimelineEvent[] = [];

      // Enrollment status logs
      const { data: statusLogs } = await supabase
        .from("enrollment_status_logs")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      statusLogs?.forEach(log => {
        timeline.push({
          id: `status-${log.id}`,
          date: log.created_at || "",
          type: "status",
          title: "Status Changed",
          detail: `${log.old_enrollment_status} → ${log.new_enrollment_status}${log.reason ? ` (${log.reason})` : ""}`,
          icon: AlertTriangle,
          color: "text-amber-500",
        });
      });

      // Attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      attendance?.forEach(a => {
        timeline.push({
          id: `att-${a.id}`,
          date: a.created_at,
          type: "attendance",
          title: a.status === "present" ? "Attended Class" : "No-Show",
          detail: `Class on ${a.class_date}`,
          icon: ClipboardList,
          color: a.status === "present" ? "text-green-500" : "text-red-500",
        });
      });

      // Bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, recipes(title)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      bookings?.forEach(b => {
        timeline.push({
          id: `book-${b.id}`,
          date: b.created_at,
          type: "booking",
          title: `Booking ${b.status}`,
          detail: `${(b as any).recipes?.title || "Recipe"} on ${b.booking_date} (${b.time_slot})`,
          icon: Calendar,
          color: "text-blue-500",
        });
      });

      // Payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      payments?.forEach(p => {
        timeline.push({
          id: `pay-${p.id}`,
          date: p.created_at,
          type: "payment",
          title: `Payment ${p.status}`,
          detail: `₹${Number(p.total_amount).toLocaleString()} via ${p.payment_method}`,
          icon: CreditCard,
          color: p.status === "completed" ? "text-green-500" : "text-amber-500",
        });
      });

      // Feedback
      const { data: feedback } = await supabase
        .from("feedback")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      feedback?.forEach(f => {
        timeline.push({
          id: `fb-${f.id}`,
          date: f.created_at,
          type: "feedback",
          title: `Feedback (${f.category})`,
          detail: `Rating: ${f.rating}/5`,
          icon: MessageSquare,
          color: "text-purple-500",
        });
      });

      // Job Applications
      const { data: applications } = await supabase
        .from("job_applications")
        .select("*, jobs(title, company)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      applications?.forEach(a => {
        timeline.push({
          id: `job-${a.id}`,
          date: a.created_at,
          type: "job",
          title: `Applied for ${(a as any).jobs?.title || "Job"}`,
          detail: `at ${(a as any).jobs?.company || "Company"} — ${a.status}`,
          icon: Briefcase,
          color: "text-indigo-500",
        });
      });

      // Sort by date descending
      return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events && events.length > 0 ? (
          <div className="relative space-y-0">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            {events.map(event => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex gap-4 py-3">
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border ${event.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.detail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.date ? formatDistanceToNow(new Date(event.date), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No activity recorded yet</p>
        )}
      </CardContent>
    </Card>
  );
};
