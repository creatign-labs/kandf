import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface StudentStats {
  id: string;
  name: string;
  present: number;
  absent: number;
  noShow: number;
  total: number;
  attendanceRate: number;
}

interface AttendanceStatsWidgetProps {
  attendance: any[];
}

export const AttendanceStatsWidget = ({ attendance }: AttendanceStatsWidgetProps) => {
  // Calculate per-student statistics
  const studentStatsMap = new Map<string, StudentStats>();

  attendance?.forEach((record) => {
    const studentId = record.student_id;
    const name = record.profiles
      ? `${record.profiles.first_name} ${record.profiles.last_name}`
      : "Unknown";

    if (!studentStatsMap.has(studentId)) {
      studentStatsMap.set(studentId, {
        id: studentId,
        name,
        present: 0,
        absent: 0,
        noShow: 0,
        total: 0,
        attendanceRate: 0,
      });
    }

    const stats = studentStatsMap.get(studentId)!;
    stats.total++;
    if (record.status === "present") stats.present++;
    else if (record.status === "absent") stats.absent++;
    else if (record.status === "no_show") stats.noShow++;
    stats.attendanceRate = Math.round((stats.present / stats.total) * 100);
  });

  const studentStats = Array.from(studentStatsMap.values()).sort(
    (a, b) => b.attendanceRate - a.attendanceRate
  );

  // Overall stats
  const totalRecords = attendance?.length || 0;
  const presentCount = attendance?.filter((a) => a.status === "present").length || 0;
  const absentCount = attendance?.filter((a) => a.status === "absent").length || 0;
  const noShowCount = attendance?.filter((a) => a.status === "no_show").length || 0;
  const overallRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // Students with attendance issues (< 70% or 2+ no-shows)
  const atRiskStudents = studentStats.filter(
    (s) => s.attendanceRate < 70 || s.noShow >= 2
  );

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold">{studentStats.length}</div>
          <div className="text-xs text-muted-foreground">Students</div>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold text-green-500">{presentCount}</div>
          <div className="text-xs text-muted-foreground">Present</div>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <div className="text-2xl font-bold text-red-500">{absentCount}</div>
          <div className="text-xs text-muted-foreground">Absent</div>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <div className="text-2xl font-bold text-orange-500">{noShowCount}</div>
          <div className="text-xs text-muted-foreground">No Show</div>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className={`text-2xl font-bold ${getStatusColor(overallRate)}`}>
            {overallRate}%
          </div>
          <div className="text-xs text-muted-foreground">Overall Rate</div>
        </Card>
      </div>

      {/* At Risk Students Alert */}
      {atRiskStudents.length > 0 && (
        <Card className="p-4 border-orange-500/50 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-orange-600">Students Needing Attention</h3>
          </div>
          <div className="space-y-2">
            {atRiskStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between text-sm bg-background rounded p-2"
              >
                <span>{student.name}</span>
                <div className="flex items-center gap-3">
                  <span className={getStatusColor(student.attendanceRate)}>
                    {student.attendanceRate}% attendance
                  </span>
                  {student.noShow >= 2 && (
                    <span className="text-orange-500 text-xs">
                      ({student.noShow} no-shows)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-Student Breakdown */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Student Attendance Breakdown</h3>
        <div className="space-y-4">
          {studentStats.map((student) => (
            <div key={student.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{student.name}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="text-green-500">{student.present} present</span>
                  <span className="text-red-500">{student.absent} absent</span>
                  <span className="text-orange-500">{student.noShow} no-show</span>
                  <span className={`font-semibold ${getStatusColor(student.attendanceRate)}`}>
                    {student.attendanceRate}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${getProgressColor(student.attendanceRate)} transition-all`}
                  style={{ width: `${student.attendanceRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
