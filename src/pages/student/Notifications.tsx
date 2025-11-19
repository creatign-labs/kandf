import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, CheckCircle, Info } from "lucide-react";

const notifications = [
  {
    id: 1,
    type: "alert",
    title: "Class Reminder",
    message: "Your class 'Danish Pastries' is scheduled for tomorrow at 9:00 AM",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    type: "success",
    title: "Booking Confirmed",
    message: "Your slot for 'Croissants' on Jan 25 has been confirmed",
    time: "1 day ago",
    read: false,
  },
  {
    id: 3,
    type: "info",
    title: "New Recipe Available",
    message: "Module 3: Cake Decoration is now unlocked. Start learning new techniques!",
    time: "2 days ago",
    read: true,
  },
  {
    id: 4,
    type: "alert",
    title: "Cancellation Deadline",
    message: "Last chance to cancel your booking for Jan 22. Deadline: 11:59 PM tonight",
    time: "3 days ago",
    read: true,
  },
  {
    id: 5,
    type: "success",
    title: "Assessment Completed",
    message: "Great job! You scored 92% on your Module 1 assessment",
    time: "1 week ago",
    read: true,
  },
];

const Notifications = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with your classes and progress</p>
          </div>

          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-5 border-border/60 transition-all hover:shadow-md ${
                  !notification.read ? "bg-accent/20 border-primary/20" : ""
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.read && (
                        <Badge variant="default" className="ml-2">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
