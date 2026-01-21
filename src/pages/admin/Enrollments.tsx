import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, UserPlus, Mail, Phone, Copy, Check } from "lucide-react";
import { format } from "date-fns";

const AdminEnrollments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    studentName: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state for new enrollment
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    courseId: "",
    batchId: "",
  });

  // Fetch courses
  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, base_fee")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches for selected course
  const { data: batches } = useQuery({
    queryKey: ["admin-batches", formData.courseId],
    queryFn: async () => {
      if (!formData.courseId) return [];
      const { data, error } = await supabase
        .from("batches")
        .select("id, batch_name, start_date, available_seats")
        .eq("course_id", formData.courseId)
        .gt("available_seats", 0)
        .order("start_date");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.courseId,
  });

  // Fetch pending enrollments (advance payments awaiting completion)
  const { data: pendingEnrollments, isLoading } = useQuery({
    queryKey: ["admin-pending-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advance_payments")
        .select(`
          *,
          courses(id, title, base_fee)
        `)
        .in("status", ["pending", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for each payment
      const paymentsWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, phone, account_status")
            .eq("id", payment.student_id)
            .maybeSingle();
          return { ...payment, profile };
        })
      );
      
      return paymentsWithProfiles;
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Generate a random password
      const password = Math.random().toString(36).slice(-8) + "A1!";

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create advance payment record (admin-assisted flow)
      const selectedCourse = courses?.find((c) => c.id === data.courseId);
      const { error: paymentError } = await supabase
        .from("advance_payments")
        .insert({
          student_id: authData.user.id,
          course_id: data.courseId,
          amount: 2000,
          status: "pending",
        });

      if (paymentError) throw paymentError;

      return {
        email: data.email,
        password: password,
        studentName: `${data.firstName} ${data.lastName}`,
      };
    },
    onSuccess: (credentials) => {
      setCreatedCredentials(credentials);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-enrollments"] });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        courseId: "",
        batchId: "",
      });
      toast({
        title: "Student Created",
        description: "Student account created. Share credentials and payment link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateStudent = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.courseId) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createStudentMutation.mutate(formData);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredEnrollments = pendingEnrollments?.filter((enrollment) => {
    const name = `${enrollment.profile?.first_name || ""} ${enrollment.profile?.last_name || ""}`.toLowerCase();
    const phone = enrollment.profile?.phone?.toLowerCase() || "";
    return (
      searchQuery === "" ||
      name.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: string, accountStatus?: string) => {
    if (accountStatus === "active") {
      return <Badge className="bg-green-500">Enrolled</Badge>;
    }
    if (status === "completed") {
      return <Badge className="bg-blue-500">Paid - Awaiting Approval</Badge>;
    }
    return <Badge variant="secondary">Pending Payment</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Enrollments
            </h1>
            <p className="text-muted-foreground">
              Create student accounts and manage enrollment flow
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Student</DialogTitle>
                <DialogDescription>
                  Create a student account and send them credentials for advance payment.
                </DialogDescription>
              </DialogHeader>

              {createdCredentials ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      ✓ Student Created Successfully
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Share these credentials with {createdCredentials.studentName}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <div className="flex items-center gap-2">
                        <Input value={createdCredentials.email} readOnly />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(createdCredentials.email, "email")}
                        >
                          {copiedField === "email" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input value={createdCredentials.password} readOnly />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(createdCredentials.password, "password")}
                        >
                          {copiedField === "password" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsCreateDialogOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <Label htmlFor="course">Course *</Label>
                    <Select
                      value={formData.courseId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, courseId: value, batchId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title} - ₹{course.base_fee?.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.courseId && batches && batches.length > 0 && (
                    <div>
                      <Label htmlFor="batch">Preferred Batch (Optional)</Label>
                      <Select
                        value={formData.batchId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, batchId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {batches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_name} - {batch.available_seats} seats
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleCreateStudent}
                    disabled={createStudentMutation.isPending}
                  >
                    {createStudentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Student Account
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter((e) => e.status === "pending").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Awaiting Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter(
                  (e) => e.status === "completed" && e.profile?.account_status !== "active"
                ).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enrolled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingEnrollments?.filter((e) => e.profile?.account_status === "active")
                  .length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No pending enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments?.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.profile?.first_name} {enrollment.profile?.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {enrollment.profile?.phone || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.courses?.title}</TableCell>
                      <TableCell>
                        {getStatusBadge(enrollment.status, enrollment.profile?.account_status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(enrollment.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminEnrollments;
