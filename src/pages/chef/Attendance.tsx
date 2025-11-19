import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, CheckCircle, XCircle } from "lucide-react";

const Attendance = () => {
  const attendanceHistory = [
    {
      date: "2024-01-15",
      course: "Course A",
      module: "Module 3",
      recipe: "Brownies",
      batch: "Morning (9-12)",
      students: [
        { id: "A1", name: "Emma Wilson", status: "present" },
        { id: "A2", name: "James Brown", status: "present" },
        { id: "A3", name: "Lucy Davis", status: "absent" },
        { id: "A4", name: "Tom Harris", status: "present" },
      ],
    },
    {
      date: "2024-01-14",
      course: "Course B",
      module: "Module 2",
      recipe: "Macarons",
      batch: "Evening (6-9)",
      students: [
        { id: "B1", name: "Olivia Martinez", status: "present" },
        { id: "B2", name: "Noah Taylor", status: "present" },
        { id: "B3", name: "Ava Johnson", status: "present" },
      ],
    },
    {
      date: "2024-01-13",
      course: "Course A",
      module: "Module 2",
      recipe: "Pizza Dough",
      batch: "Afternoon (2-5)",
      students: [
        { id: "A5", name: "Liam White", status: "present" },
        { id: "A6", name: "Mia Thomas", status: "absent" },
        { id: "A7", name: "Ethan Clark", status: "present" },
        { id: "A8", name: "Isabella Lee", status: "present" },
      ],
    },
  ];

  const getAttendanceRate = (students: any[]) => {
    const present = students.filter(s => s.status === "present").length;
    return Math.round((present / students.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" userName="Chef Marco" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Attendance History</h1>
          <p className="text-muted-foreground">View past class attendance records and student participation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Classes</div>
            <div className="text-3xl font-bold text-foreground">45</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Average Attendance</div>
            <div className="text-3xl font-bold text-green-500">92%</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed This Month</div>
            <div className="text-3xl font-bold text-blue-500">12</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Students Trained</div>
            <div className="text-3xl font-bold text-purple-500">67</div>
          </Card>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select defaultValue="all-courses">
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-courses">All Courses</SelectItem>
                <SelectItem value="course-a">Course A</SelectItem>
                <SelectItem value="course-b">Course B</SelectItem>
                <SelectItem value="course-c">Course C</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-months">
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-months">All Months</SelectItem>
                <SelectItem value="january">January 2024</SelectItem>
                <SelectItem value="december">December 2023</SelectItem>
                <SelectItem value="november">November 2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 ml-auto">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          <div className="space-y-4">
            {attendanceHistory.map((record, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-lg">{record.date}</span>
                      <Badge>{record.batch}</Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {record.course} • {record.module} • {record.recipe}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-500">
                      {getAttendanceRate(record.students)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Attendance Rate</div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.id}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {student.status === "present" ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <Badge className="bg-green-500">Present</Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <Badge className="bg-red-500">Absent</Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Attendance;
