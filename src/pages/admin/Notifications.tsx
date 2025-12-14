import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Plus, Send, Users, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Notifications = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target: "all",
  });
  const queryClient = useQueryClient();

  // Fetch all notifications (for admin view)
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, profiles:user_id(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Fetch all students for targeting
  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(id, first_name, last_name)")
        .eq("role", "student");

      if (error) throw error;
      return data;
    },
  });

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      let userIds: string[] = [];

      if (formData.target === "all") {
        // Get all student user IDs
        const { data: allStudents } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "student");
        userIds = allStudents?.map((s) => s.user_id) || [];
      } else {
        userIds = [formData.target];
      }

      if (userIds.length === 0) {
        throw new Error("No recipients found");
      }

      // Create notification for each user
      const notificationsToInsert = userIds.map((userId) => ({
        user_id: userId,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        read: false,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setIsDialogOpen(false);
      setFormData({ title: "", message: "", type: "info", target: "all" });
      toast({
        title: "Notification sent!",
        description: "All selected users have been notified.",
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "error":
        return <Badge className="bg-red-500">Alert</Badge>;
      default:
        return <Badge>Info</Badge>;
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
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Notifications & Announcements
          </h1>
          <p className="text-muted-foreground">
            Send notifications to students and manage announcements
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Total Sent
                </div>
                <div className="text-3xl font-bold">
                  {notifications?.length || 0}
                </div>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Total Students
                </div>
                <div className="text-3xl font-bold">{students?.length || 0}</div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Unread
                </div>
                <div className="text-3xl font-bold text-primary">
                  {notifications?.filter((n) => !n.read).length || 0}
                </div>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Send Notification Button */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold mb-1">Send New Notification</h2>
              <p className="text-muted-foreground text-sm">
                Broadcast announcements to all students or send targeted messages
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Notification title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Write your message here..."
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Send To</Label>
                    <Select
                      value={formData.target}
                      onValueChange={(value) =>
                        setFormData({ ...formData, target: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {students?.map((student: any) => (
                          <SelectItem key={student.user_id} value={student.user_id}>
                            {student.profiles?.first_name} {student.profiles?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => sendMutation.mutate()}
                    disabled={
                      !formData.title || !formData.message || sendMutation.isPending
                    }
                  >
                    {sendMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Notifications History */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Notification History</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications?.map((notification: any) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">
                      {notification.title}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {notification.message}
                    </TableCell>
                    <TableCell>
                      {notification.profiles?.first_name}{" "}
                      {notification.profiles?.last_name}
                    </TableCell>
                    <TableCell>{getTypeBadge(notification.type)}</TableCell>
                    <TableCell>
                      <Badge variant={notification.read ? "secondary" : "default"}>
                        {notification.read ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(notification.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No notifications sent yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Notifications;
