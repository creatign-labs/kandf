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
import { Search, Download, UserCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

const Students = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all-status");

  // Fetch all enrollments with student profiles and courses
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses(id, title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately for each enrollment
      const enrollmentsWithProfiles = await Promise.all(
        (data || []).map(async (enrollment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone')
            .eq('id', enrollment.student_id)
            .single();
          return { ...enrollment, profile };
        })
      );
      return data;
    }
  });

  // Fetch unique courses for filter
  const { data: courses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    
    return enrollments.filter((enrollment) => {
      const fullName = `${enrollment.profiles?.first_name || ''} ${enrollment.profiles?.last_name || ''}`.toLowerCase();
      const phone = enrollment.profiles?.phone?.toLowerCase() || '';
      const matchesSearch = searchQuery === "" || 
        fullName.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase());
      
      const matchesCourse = courseFilter === "all" || enrollment.courses?.id === courseFilter;
      
      const matchesStatus = statusFilter === "all-status" || 
        (statusFilter === "active" && enrollment.status === "active") ||
        (statusFilter === "completed" && enrollment.status === "completed") ||
        (statusFilter === "onhold" && enrollment.status === "on_hold");
      
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [enrollments, searchQuery, courseFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!enrollments) return { total: 0, active: 0, completed: 0, onHold: 0 };
    
    return {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'active').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      onHold: enrollments.filter(e => e.status === 'on_hold').length,
    };
  }, [enrollments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "on_hold":
        return "On Hold";
      default:
        return status;
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Student Management</h1>
          <p className="text-muted-foreground">View and manage all enrolled students</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or phone..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">
                          {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {enrollment.profiles?.phone || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{enrollment.courses?.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${enrollment.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm">{enrollment.progress || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(enrollment.status)}>
                        {getStatusLabel(enrollment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(enrollment.enrollment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEnrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Students</div>
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Students</div>
            <div className="text-3xl font-bold text-green-500">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-500">{stats.completed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">On Hold</div>
            <div className="text-3xl font-bold text-yellow-500">{stats.onHold}</div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Students;