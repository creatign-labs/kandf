import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, Package, AlertCircle } from "lucide-react";

const AdminDashboard = () => {
  const leads = [
    { id: "L001", name: "Emily Parker", course: "Course A", stage: "New", date: "2024-01-15" },
    { id: "L002", name: "Michael Chen", course: "Course B", stage: "Contacted", date: "2024-01-14" },
    { id: "L003", name: "Sarah Williams", course: "Course A", stage: "Visited", date: "2024-01-13" },
    { id: "L004", name: "James Brown", course: "Course C", stage: "Converted", date: "2024-01-12" },
  ];

  const todaysClasses = [
    { time: "09:00 AM", course: "Course A - Bread Basics", chef: "Chef Marie", students: 8, capacity: 10 },
    { time: "11:00 AM", course: "Course B - Pastry Fundamentals", chef: "Chef Pierre", students: 10, capacity: 10 },
    { time: "02:00 PM", course: "Course C - Cake Decoration", chef: "Chef Sophie", students: 6, capacity: 8 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <div className="container px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor academy operations and manage all aspects</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Students"
            value="148"
            icon={Users}
            variant="primary"
            trend="up"
            trendValue="+12%"
          />
          <StatsCard
            title="New Leads"
            value="23"
            icon={TrendingUp}
            variant="success"
            description="This week"
          />
          <StatsCard
            title="Today's Classes"
            value="12"
            icon={Calendar}
            variant="warning"
            description="8 ongoing, 4 upcoming"
          />
          <StatsCard
            title="Inventory Alerts"
            value="5"
            icon={AlertCircle}
            variant="default"
            description="Low stock items"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Leads */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Recent Leads</h2>
                  <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>

              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.course}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        lead.stage === "New" ? "default" :
                        lead.stage === "Contacted" ? "secondary" :
                        lead.stage === "Visited" ? "outline" :
                        "default"
                      }>
                        {lead.stage}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{lead.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Today's Classes */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Today's Schedule</h2>
                  <p className="text-sm text-muted-foreground">All classes for today</p>
                </div>
                <Button variant="outline" size="sm">
                  Full Calendar
                </Button>
              </div>

              <div className="space-y-3">
                {todaysClasses.map((cls, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-medium text-primary">{cls.time}</div>
                      </div>
                      <div>
                        <div className="font-medium">{cls.course}</div>
                        <div className="text-sm text-muted-foreground">{cls.chef}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={cls.students === cls.capacity ? "default" : "outline"}>
                        {cls.students}/{cls.capacity} students
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Add New Student
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Class
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Update Inventory
                </Button>
              </div>
            </Card>

            {/* Inventory Alerts */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Inventory Alerts</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="font-medium text-sm">All-purpose flour</div>
                  <div className="text-sm text-muted-foreground">Low stock: 5kg remaining</div>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="font-medium text-sm">Butter (unsalted)</div>
                  <div className="text-sm text-muted-foreground">Order needed for tomorrow</div>
                </div>
                <Button variant="link" size="sm" className="w-full">
                  View All Alerts
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
