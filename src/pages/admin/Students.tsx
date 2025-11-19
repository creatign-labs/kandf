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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, UserCircle } from "lucide-react";

const Students = () => {
  const students = [
    {
      id: "A1",
      name: "Emma Wilson",
      email: "emma.w@email.com",
      phone: "+1 234-567-8901",
      course: "Course A",
      batch: "Morning (9-12)",
      progress: 65,
      status: "Active",
    },
    {
      id: "A2",
      name: "James Brown",
      email: "james.b@email.com",
      phone: "+1 234-567-8902",
      course: "Course A",
      batch: "Afternoon (2-5)",
      progress: 80,
      status: "Active",
    },
    {
      id: "B1",
      name: "Olivia Martinez",
      email: "olivia.m@email.com",
      phone: "+1 234-567-8903",
      course: "Course B",
      batch: "Morning (9-12)",
      progress: 45,
      status: "Active",
    },
    {
      id: "B2",
      name: "Noah Taylor",
      email: "noah.t@email.com",
      phone: "+1 234-567-8904",
      course: "Course B",
      batch: "Evening (6-9)",
      progress: 90,
      status: "Active",
    },
    {
      id: "C1",
      name: "Sophia Lee",
      email: "sophia.l@email.com",
      phone: "+1 234-567-8905",
      course: "Course C",
      batch: "Morning (9-12)",
      progress: 100,
      status: "Completed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Completed":
        return "bg-blue-500";
      case "On Hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Student Management</h1>
          <p className="text-muted-foreground">View and manage all enrolled students</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID, name, email, or phone..." className="pl-10" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="course-a">Course A</SelectItem>
                <SelectItem value="course-b">Course B</SelectItem>
                <SelectItem value="course-c">Course C</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="onhold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Batch Timing</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-bold">{student.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{student.email}</div>
                        <div className="text-muted-foreground">{student.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>{student.batch}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-sm">{student.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Students</div>
            <div className="text-3xl font-bold text-foreground">87</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Students</div>
            <div className="text-3xl font-bold text-green-500">75</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-500">12</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">On Hold</div>
            <div className="text-3xl font-bold text-yellow-500">0</div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Students;
