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
import { Search, Phone, Mail, Calendar } from "lucide-react";

const Leads = () => {
  const leads = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "+1 234-567-8901",
      course: "Course A - Basic Baking",
      stage: "New",
      date: "2024-01-15",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "+1 234-567-8902",
      course: "Course B - Advanced Pastry",
      stage: "Contacted",
      date: "2024-01-14",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.r@email.com",
      phone: "+1 234-567-8903",
      course: "Course C - Professional Chef",
      stage: "Follow-up",
      date: "2024-01-13",
    },
    {
      id: 4,
      name: "David Kim",
      email: "d.kim@email.com",
      phone: "+1 234-567-8904",
      course: "Course A - Basic Baking",
      stage: "Converted",
      date: "2024-01-12",
    },
    {
      id: 5,
      name: "Lisa Anderson",
      email: "lisa.a@email.com",
      phone: "+1 234-567-8905",
      course: "Course B - Advanced Pastry",
      stage: "Lost",
      date: "2024-01-11",
    },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "New":
        return "bg-blue-500";
      case "Contacted":
        return "bg-purple-500";
      case "Follow-up":
        return "bg-yellow-500";
      case "Converted":
        return "bg-green-500";
      case "Lost":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Lead Management</h1>
          <p className="text-muted-foreground">Track and manage potential students through the enrollment pipeline</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads by name, email, or phone..." className="pl-10" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
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
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Interested Course</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{lead.course}</TableCell>
                    <TableCell>
                      <Badge className={getStageColor(lead.stage)}>
                        {lead.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {lead.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Contact
                        </Button>
                        <Button variant="outline" size="sm">
                          Convert
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">12</div>
            <div className="text-sm text-muted-foreground">New</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">8</div>
            <div className="text-sm text-muted-foreground">Contacted</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">5</div>
            <div className="text-sm text-muted-foreground">Follow-up</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">23</div>
            <div className="text-sm text-muted-foreground">Converted</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">4</div>
            <div className="text-sm text-muted-foreground">Lost</div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Leads;
