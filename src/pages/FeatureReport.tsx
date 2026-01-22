import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { 
  Download, 
  Globe, 
  GraduationCap, 
  ChefHat, 
  Shield, 
  Server,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeatureReport = () => {
  const navigate = useNavigate();
  const reportDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const sections = [
    {
      title: "Public Website",
      icon: Globe,
      features: [
        { name: "Homepage", desc: "Hero section, course highlights, testimonials, CTA" },
        { name: "About Page", desc: "Academy story, mission, team information" },
        { name: "Contact Page", desc: "Contact form, location details, social links" },
        { name: "Course Catalog", desc: "List of all courses with filters" },
        { name: "Course Detail", desc: "Full course info, curriculum, batch availability" },
        { name: "Lead Enquiry Form", desc: "Capture interested visitors as leads" },
        { name: "Flow Walkthrough", desc: "Interactive documentation for all 9 system flows" },
        { name: "Login/Signup", desc: "Authentication with role-based redirects" },
      ]
    },
    {
      title: "Student Portal",
      icon: GraduationCap,
      features: [
        { name: "Dashboard", desc: "Progress overview, upcoming classes, quick actions" },
        { name: "My Course", desc: "Enrolled course with module breakdown" },
        { name: "Recipe Detail", desc: "Video player, ingredients, step-by-step instructions" },
        { name: "Slot Booking", desc: "Calendar-based booking with 1-day lead time validation" },
        { name: "My Bookings", desc: "View/cancel upcoming bookings" },
        { name: "Assessments", desc: "Sequential quiz engine with timer" },
        { name: "Certificates", desc: "Download certificates upon 3-gate eligibility" },
        { name: "Profile Management", desc: "Edit personal info, upload documents" },
        { name: "Resume Builder", desc: "Create and download professional resume" },
        { name: "Jobs Portal", desc: "Browse and apply for job listings" },
        { name: "Notifications", desc: "System alerts and updates" },
        { name: "Feedback System", desc: "Submit categorized feedback with ratings" },
        { name: "Onboarding Wizard", desc: "Multi-step preference collection" },
        { name: "Awaiting Approval", desc: "Status page for pending account activation" },
      ]
    },
    {
      title: "Chef Portal",
      icon: ChefHat,
      features: [
        { name: "Dashboard", desc: "Today's schedule, attendance stats, quick actions" },
        { name: "Attendance Management", desc: "Mark present/absent with 3-strike lockout logic" },
        { name: "Daily Ingredients", desc: "View tomorrow's ingredient requirements" },
        { name: "Inventory Usage", desc: "Log ingredient consumption per batch" },
        { name: "All Recipes", desc: "Browse complete recipe library" },
        { name: "My Specializations", desc: "Assigned recipes for teaching" },
      ]
    },
    {
      title: "Admin Portal",
      icon: Shield,
      features: [
        { name: "Dashboard", desc: "KPIs, charts, recent activity feed" },
        { name: "Course Management", desc: "CRUD operations for courses" },
        { name: "Batch Management", desc: "Create batches, set capacity, assign schedules" },
        { name: "Enrollments", desc: "View all enrollments with status filters" },
        { name: "Student Approvals", desc: "Review pending students, approve with password generation" },
        { name: "Students List", desc: "Comprehensive student directory with filters" },
        { name: "Staff Management", desc: "Manage chefs and other staff roles" },
        { name: "Lead Management", desc: "Track and update lead stages" },
        { name: "Recipe Library", desc: "Full CRUD for recipes with ingredients" },
        { name: "Recipe Ingredients", desc: "Map ingredients to recipes with quantities" },
        { name: "Booking Recipe Assignment", desc: "Assign recipes to confirmed bookings" },
        { name: "Ingredients Inventory", desc: "Stock levels, reorder alerts" },
        { name: "Daily Inventory Requirements", desc: "Auto-generated shopping lists" },
        { name: "Inventory Checklist", desc: "Approval workflow for purchases" },
        { name: "Notifications", desc: "Send system-wide or targeted notifications" },
        { name: "Super Admin Management", desc: "Promote/demote admin privileges" },
      ]
    },
    {
      title: "Backend & Automations",
      icon: Server,
      features: [
        { name: "Razorpay Integration", desc: "Secure payment processing for enrollments" },
        { name: "4 PM Ingredient Push", desc: "Daily cron job alerting chefs of stock needs" },
        { name: "Attendance Auto-Closure", desc: "Auto-mark absents at midnight" },
        { name: "Inventory Auto-Deduction", desc: "Trigger-based stock updates on attendance" },
        { name: "Certificate Generation", desc: "Auto-issue upon eligibility criteria met" },
        { name: "3-Strike Lockout", desc: "No-show penalty system for booking abuse" },
        { name: "Sequential Student IDs", desc: "Course-prefixed unique identifiers" },
        { name: "Demo User Generator", desc: "Edge function for test accounts" },
        { name: "RLS Security Policies", desc: "Row-level security on all tables" },
      ]
    }
  ];

  const pendingItems = [
    { name: "Email Delivery", desc: "Requires RESEND_API_KEY configuration" },
    { name: "Live Payments", desc: "Switch Razorpay to production keys" },
  ];

  const stats = {
    totalPages: "40+",
    edgeFunctions: "10",
    cronJobs: "2",
    dbTables: "25+",
    userRoles: "4"
  };

  const generatePDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Feature Report - Knead & Frost Academy</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 40px; 
            color: #1a1a2e;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #d4a574;
          }
          .logo { 
            font-size: 28px; 
            font-weight: bold;
            color: #1a1a2e;
            margin-bottom: 8px;
          }
          .logo span { color: #d4a574; }
          .subtitle { 
            font-size: 20px; 
            color: #666;
            margin-bottom: 8px;
          }
          .date { 
            font-size: 14px; 
            color: #888;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 40px;
          }
          .stat-box {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #d4a574;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }
          .section { 
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold;
            color: #1a1a2e;
            margin-bottom: 15px;
            padding: 10px 15px;
            background: #f8f9fa;
            border-left: 4px solid #d4a574;
            border-radius: 0 8px 8px 0;
          }
          .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .feature {
            padding: 12px;
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 6px;
          }
          .feature-name {
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 4px;
          }
          .feature-desc {
            font-size: 13px;
            color: #666;
          }
          .pending-section {
            background: #fff8e6;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ffd966;
            margin-top: 30px;
          }
          .pending-title {
            font-size: 16px;
            font-weight: bold;
            color: #996600;
            margin-bottom: 15px;
          }
          .pending-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .pending-dot {
            width: 8px;
            height: 8px;
            background: #ffd966;
            border-radius: 50%;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 12px;
            color: #888;
          }
          @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Knead <span>&</span> Frost Academy</div>
          <div class="subtitle">Platform Feature Report</div>
          <div class="date">Generated on ${reportDate}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${stats.totalPages}</div>
            <div class="stat-label">Total Pages</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.edgeFunctions}</div>
            <div class="stat-label">Edge Functions</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.cronJobs}</div>
            <div class="stat-label">Cron Jobs</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.dbTables}</div>
            <div class="stat-label">Database Tables</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.userRoles}</div>
            <div class="stat-label">User Roles</div>
          </div>
        </div>

        ${sections.map(section => `
          <div class="section">
            <div class="section-title">${section.title}</div>
            <div class="feature-grid">
              ${section.features.map(f => `
                <div class="feature">
                  <div class="feature-name">✓ ${f.name}</div>
                  <div class="feature-desc">${f.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}

        <div class="pending-section">
          <div class="pending-title">⏳ Pending External Configuration</div>
          ${pendingItems.map(item => `
            <div class="pending-item">
              <div class="pending-dot"></div>
              <div>
                <strong>${item.name}:</strong> ${item.desc}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>Knead & Frost Academy - Learning Management System</p>
          <p>Confidential Client Document</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      // Fallback: download as HTML
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Feature-Report-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Platform Feature Report</h1>
            <p className="text-muted-foreground">Generated on {reportDate}</p>
          </div>
          <Button onClick={generatePDF} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Download PDF
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Pages", value: stats.totalPages },
            { label: "Edge Functions", value: stats.edgeFunctions },
            { label: "Cron Jobs", value: stats.cronJobs },
            { label: "Database Tables", value: stats.dbTables },
            { label: "User Roles", value: stats.userRoles },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Sections */}
        {sections.map((section) => (
          <Card key={section.title} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <section.icon className="h-6 w-6 text-primary" />
                {section.title}
                <Badge variant="secondary">{section.features.length} features</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {section.features.map((feature) => (
                  <div 
                    key={feature.name} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-sm text-muted-foreground">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Pending Items */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-amber-800">
              <Clock className="h-6 w-6" />
              Pending External Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.name} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                  <div>
                    <span className="font-medium text-amber-900">{item.name}:</span>{" "}
                    <span className="text-amber-700">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeatureReport;
