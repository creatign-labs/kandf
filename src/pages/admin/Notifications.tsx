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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell, Plus, Send, Users, Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RecipientSelector } from "@/components/admin/RecipientSelector";

const Notifications = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
  });
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
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

  // Fetch chefs for targeting
  const { data: chefs } = useQuery({
    queryKey: ["all-chefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(id, first_name, last_name)")
        .eq("role", "chef");

      if (error) throw error;
      return data;
    },
  });

  // Fetch admins for targeting
  const { data: admins } = useQuery({
    queryKey: ["all-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(id, first_name, last_name)")
        .in("role", ["admin", "super_admin"]);

      if (error) throw error;
      return data;
    },
  });

  // Send notification mutation with logging
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const userIdsSet = new Set<string>();

      // Add users from selected segments
      if (selectedSegments.includes("all_students")) {
        students?.forEach((s) => userIdsSet.add(s.user_id));
      }
      if (selectedSegments.includes("all_chefs")) {
        chefs?.forEach((c) => userIdsSet.add(c.user_id));
      }
      if (selectedSegments.includes("all_admins")) {
        admins?.forEach((a) => userIdsSet.add(a.user_id));
      }

      // Add individually selected users
      selectedIndividuals.forEach((id) => userIdsSet.add(id));

      const userIds = Array.from(userIdsSet);

      if (userIds.length === 0) {
        throw new Error("No recipients selected");
      }

      // Create notification for each user
      const notificationsToInsert = userIds.map((userId) => ({
        user_id: userId,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        read: false,
      }));

      const { data: insertedNotifications, error } = await supabase
        .from("notifications")
        .insert(notificationsToInsert)
        .select();

      if (error) throw error;

      // Log each notification sent
      const logsToInsert = userIds.map((userId) => ({
        sent_by: user.id,
        recipient_id: userId,
        title: formData.title,
        message: formData.message,
        notification_id: insertedNotifications?.[0]?.id || null,
      }));

      await supabase.from("notification_logs").insert(logsToInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setIsDialogOpen(false);
      setShowConfirmDialog(false);
      setFormData({ title: "", message: "", type: "info" });
      setSelectedSegments([]);
      setSelectedIndividuals([]);
      toast({
        title: "Notification sent!",
        description: "All selected users have been notified.",
      });
    },
    onError: (error: Error) => {
      setShowConfirmDialog(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmSend = () => {
    sendMutation.mutate();
  };

  const getRecipientCount = () => {
    const userIdsSet = new Set<string>();

    if (selectedSegments.includes("all_students")) {
      students?.forEach((s) => userIdsSet.add(s.user_id));
    }
    if (selectedSegments.includes("all_chefs")) {
      chefs?.forEach((c) => userIdsSet.add(c.user_id));
    }
    if (selectedSegments.includes("all_admins")) {
      admins?.forEach((a) => userIdsSet.add(a.user_id));
    }

    selectedIndividuals.forEach((id) => userIdsSet.add(id));

    return userIdsSet.size;
  };

  const getRecipientSummary = () => {
    const parts: string[] = [];
    if (selectedSegments.includes("all_students")) parts.push("All Students");
    if (selectedSegments.includes("all_chefs")) parts.push("All Chefs");
    if (selectedSegments.includes("all_admins")) parts.push("All Admins");
    
    const individualCount = selectedIndividuals.filter((id) => {
      const isStudent = students?.some((s) => s.user_id === id);
      const isChef = chefs?.some((c) => c.user_id === id);
      const isAdmin = admins?.some((a) => a.user_id === id);
      
      if (isStudent && selectedSegments.includes("all_students")) return false;
      if (isChef && selectedSegments.includes("all_chefs")) return false;
      if (isAdmin && selectedSegments.includes("all_admins")) return false;
      
      return true;
    }).length;

    if (individualCount > 0) {
      parts.push(`${individualCount} individual(s)`);
    }

    return parts.join(", ") || "None selected";
  };

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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Notification Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter notification title..."
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Notification Message</Label>
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

                  <RecipientSelector
                    students={students || []}
                    chefs={chefs || []}
                    admins={admins || []}
                    selectedSegments={selectedSegments}
                    selectedIndividuals={selectedIndividuals}
                    onSegmentChange={setSelectedSegments}
                    onIndividualChange={setSelectedIndividuals}
                  />

                  <Button
                    className="w-full gap-2"
                    onClick={handleSendClick}
                    disabled={
                      !formData.title || 
                      !formData.message || 
                      sendMutation.isPending ||
                      (selectedSegments.length === 0 && selectedIndividuals.length === 0)
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
                        Review & Send
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Confirm Notification
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>You are about to send the following notification:</p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div>
                        <span className="font-medium">Title:</span> {formData.title}
                      </div>
                      <div>
                        <span className="font-medium">Message:</span> {formData.message}
                      </div>
                      <div>
                        <span className="font-medium">Recipients:</span>{" "}
                        {getRecipientSummary()} ({getRecipientCount()} user(s))
                      </div>
                    </div>
                    <p className="text-amber-600 font-medium">
                      This action cannot be undone. Are you sure you want to send this notification?
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmSend} disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Confirm & Send"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
