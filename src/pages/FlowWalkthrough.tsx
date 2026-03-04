import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, Calendar, ClipboardCheck, FileText, Award, 
  ChefHat, Package, Briefcase, MessageSquare, ArrowRight,
  CheckCircle, Users, Shield
} from "lucide-react";

const FlowWalkthrough = () => {
  const flows = [
    {
      id: "flow1",
      title: "Flow 1: Admin-Assisted Enrollment",
      icon: UserPlus,
      description: "Complete student onboarding from account creation to approval",
      actors: ["Admin", "Student", "Super Admin"],
      steps: [
        {
          actor: "Admin",
          action: "Create Student Account",
          route: "/admin/enrollments",
          details: "Navigate to Admin Dashboard → Enrollments → Click 'Add Student'. Fill in student details (name, email, phone, course selection).",
        },
        {
          actor: "System",
          action: "Generate Payment Link",
          route: "-",
          details: "System creates advance payment record (₹2,000) and student account with 'pending' status.",
        },
        {
          actor: "Student",
          action: "Pay Advance Fee",
          route: "/advance-payment",
          details: "Student receives payment link, pays ₹2,000 via Razorpay (UPI/Netbanking/Card). Status changes to 'advance_paid'.",
        },
        {
          actor: "Super Admin",
          action: "Approve & Issue Credentials",
          route: "/admin/students?tab=awaiting",
          details: "Navigate to Student Approvals → Click 'Approve' → System generates password → Copy and share credentials with student.",
        },
        {
          actor: "Student",
          action: "Login & Access Dashboard",
          route: "/login → /student",
          details: "Student logs in with issued credentials and gains full dashboard access.",
        },
      ],
      testCredentials: [
        { role: "Admin", email: "admin@demo.com", password: "Admin@123" },
        { role: "Super Admin", email: "superadmin@demo.com", password: "SuperAdmin123!" },
        { role: "Pending Student", email: "student2@demo.com", password: "Demo123!" },
      ],
    },
    {
      id: "flow2",
      title: "Flow 2: Student Slot Booking",
      icon: Calendar,
      description: "Book class slots at least one day in advance",
      actors: ["Student"],
      steps: [
        {
          actor: "Student",
          action: "Navigate to My Bookings",
          route: "/student/my-bookings",
          details: "From Student Dashboard, click 'My Bookings' in the navigation.",
        },
        {
          actor: "Student",
          action: "Select 'Book Slot' Tab",
          route: "-",
          details: "Ensure you're on the 'Book Slot' tab (not 'My Bookings').",
        },
        {
          actor: "Student",
          action: "Choose Date",
          route: "-",
          details: "Select a date from the calendar. Must be at least 1 day ahead (tomorrow or later).",
        },
        {
          actor: "Student",
          action: "Select Time Slot",
          route: "-",
          details: "Choose an available time slot (Morning, Afternoon, or Evening batch).",
        },
        {
          actor: "Student",
          action: "Confirm Booking",
          route: "-",
          details: "Review booking summary and click 'Confirm Booking'. Booking appears in 'My Bookings' tab.",
        },
      ],
      testCredentials: [
        { role: "Active Student", email: "student@demo.com", password: "Demo123!" },
      ],
      rules: [
        "Bookings must be made at least 1 day in advance",
        "Cancellation allowed until 11:59 PM the previous day",
        "No-shows consume the class slot (no automatic rebooking)",
      ],
    },
    {
      id: "flow3",
      title: "Flow 3: Chef Attendance Marking",
      icon: ClipboardCheck,
      description: "Mark student attendance for each class session",
      actors: ["Chef"],
      steps: [
        {
          actor: "Chef",
          action: "Login to Chef Portal",
          route: "/login → /chef",
          details: "Login with chef credentials to access the Chef Dashboard.",
        },
        {
          actor: "Chef",
          action: "Navigate to Attendance",
          route: "/chef/attendance",
          details: "Click 'Attendance' in the sidebar navigation.",
        },
        {
          actor: "Chef",
          action: "View Today's Students",
          route: "-",
          details: "See list of enrolled students with their batch and course information.",
        },
        {
          actor: "Chef",
          action: "Mark Attendance Status",
          route: "-",
          details: "For each student, click: 'Present' (green), 'Absent' (red), or 'No Show' (orange).",
        },
        {
          actor: "System",
          action: "Auto-Deduct Inventory",
          route: "-",
          details: "When marked 'Present', system automatically deducts recipe ingredients from inventory.",
        },
      ],
      testCredentials: [
        { role: "Chef", email: "chef@demo.com", password: "Chef123!" },
      ],
      rules: [
        "3 'No Show' marks = Student login automatically disabled",
        "Inventory deduction triggered only on 'Present' status",
        "Attendance cannot be changed after 24 hours",
      ],
    },
    {
      id: "flow4",
      title: "Flow 4: Student Assessment",
      icon: FileText,
      description: "Complete quizzes and track course progress",
      actors: ["Student"],
      steps: [
        {
          actor: "Student",
          action: "Navigate to Assessments",
          route: "/student/assessments",
          details: "From the 'More' dropdown menu, select 'Assessments'.",
        },
        {
          actor: "Student",
          action: "View Available Quizzes",
          route: "-",
          details: "See list of assessments. First quiz is always unlocked; others unlock sequentially.",
        },
        {
          actor: "Student",
          action: "Start Quiz",
          route: "-",
          details: "Click 'Start Quiz' on an available assessment.",
        },
        {
          actor: "Student",
          action: "Answer Questions",
          route: "-",
          details: "Read each question carefully and select the best answer from multiple choices.",
        },
        {
          actor: "Student",
          action: "Submit & View Results",
          route: "-",
          details: "Click 'Submit' to complete. View score and pass/fail status. Next quiz unlocks if passed.",
        },
      ],
      testCredentials: [
        { role: "Active Student", email: "student@demo.com", password: "Demo123!" },
      ],
      rules: [
        "Quizzes must be completed sequentially",
        "Passing score varies by assessment (typically 60-75%)",
        "Progress percentage updates after each completed quiz",
      ],
    },
    {
      id: "flow5",
      title: "Flow 5: Certificate Eligibility",
      icon: Award,
      description: "Earn certification upon course completion",
      actors: ["Student", "Chef/Admin"],
      steps: [
        {
          actor: "Student",
          action: "Complete All Assessments",
          route: "/student/assessments",
          details: "Pass all course quizzes to reach 100% progress.",
        },
        {
          actor: "Student",
          action: "Complete All Payments",
          route: "/student (dashboard)",
          details: "Ensure all payment installments are marked as paid.",
        },
        {
          actor: "Chef/Admin",
          action: "Mark Attendance Complete",
          route: "/chef/attendance or /admin/students",
          details: "Chef or Admin marks 'Attendance Completed' toggle for the student.",
        },
        {
          actor: "System",
          action: "Auto-Generate Certificate",
          route: "-",
          details: "When all 3 conditions met, system generates certificate automatically.",
        },
        {
          actor: "Student",
          action: "View/Download Certificate",
          route: "/student/certificates",
          details: "Navigate to Certificates page to view and download the earned certificate.",
        },
      ],
      testCredentials: [
        { role: "Active Student", email: "student@demo.com", password: "Demo123!" },
      ],
      conditions: [
        "✓ 100% Course Progress (all assessments passed)",
        "✓ Full Payment Completed",
        "✓ Attendance Marked as Complete",
      ],
    },
    {
      id: "flow6",
      title: "Flow 6: Recipe Assignment",
      icon: ChefHat,
      description: "Assign specific recipes to student class sessions",
      actors: ["Admin"],
      steps: [
        {
          actor: "Admin",
          action: "Navigate to Booking Recipes",
          route: "/admin/booking-recipes",
          details: "From Admin Dashboard sidebar, click 'Booking Recipes'.",
        },
        {
          actor: "Admin",
          action: "Select Date",
          route: "-",
          details: "Choose the class date to view all bookings for that day.",
        },
        {
          actor: "Admin",
          action: "View Student Bookings",
          route: "-",
          details: "See all confirmed student bookings grouped by time slot.",
        },
        {
          actor: "Admin",
          action: "Assign Recipe to Each Booking",
          route: "-",
          details: "Use the dropdown to select a recipe for each student's booking.",
        },
        {
          actor: "Chef",
          action: "View Recipe Groups",
          route: "/chef",
          details: "Chef Dashboard shows 'Today's Recipe Groups' with students grouped by recipe and time slot.",
        },
      ],
      testCredentials: [
        { role: "Admin", email: "admin@demo.com", password: "Admin@123" },
        { role: "Chef", email: "chef@demo.com", password: "Chef123!" },
      ],
    },
    {
      id: "flow7",
      title: "Flow 7: Inventory Management",
      icon: Package,
      description: "Generate daily requirements, approve, and track usage",
      actors: ["Admin", "Super Admin", "Chef"],
      steps: [
        {
          actor: "Admin",
          action: "Generate Daily Requirements",
          route: "/admin/daily-inventory",
          details: "Select date → Click 'Generate Requirements'. System calculates ingredients based on bookings and recipes.",
        },
        {
          actor: "System",
          action: "Calculate Requirements",
          route: "-",
          details: "Aggregates recipe ingredients for all confirmed bookings, compares with current stock.",
        },
        {
          actor: "Super Admin",
          action: "Review & Approve Checklist",
          route: "/admin/daily-inventory",
          details: "Super Admin reviews the generated list and clicks 'Approve' to finalize.",
        },
        {
          actor: "Chef",
          action: "Log Additional Usage",
          route: "/chef/inventory-usage",
          details: "During class, chef can log any additional ingredient usage not covered by the standard recipe.",
        },
        {
          actor: "System",
          action: "Low Stock Alerts",
          route: "-",
          details: "System sends notifications to admins when inventory falls below reorder level.",
        },
      ],
      testCredentials: [
        { role: "Admin", email: "admin@demo.com", password: "Admin@123" },
        { role: "Super Admin", email: "superadmin@demo.com", password: "SuperAdmin123!" },
        { role: "Chef", email: "chef@demo.com", password: "Chef123!" },
      ],
    },
    {
      id: "flow8",
      title: "Flow 8: Job Application",
      icon: Briefcase,
      description: "Browse and apply to job opportunities",
      actors: ["Student"],
      steps: [
        {
          actor: "Student",
          action: "Navigate to Jobs",
          route: "/student/jobs",
          details: "From the 'More' dropdown menu, select 'Jobs'.",
        },
        {
          actor: "Student",
          action: "Browse Job Listings",
          route: "-",
          details: "View available positions from partner employers (hotels, bakeries, restaurants).",
        },
        {
          actor: "Student",
          action: "Search & Filter",
          route: "-",
          details: "Use the search bar to filter by job title, company, or description.",
        },
        {
          actor: "Student",
          action: "Apply to Job",
          route: "-",
          details: "Click 'Apply Now' on desired position. Button changes to 'Applied' after submission.",
        },
        {
          actor: "Admin",
          action: "Review Applications",
          route: "/admin",
          details: "Admin can view and manage job applications from the admin portal.",
        },
      ],
      testCredentials: [
        { role: "Active Student", email: "student@demo.com", password: "Demo123!" },
      ],
    },
    {
      id: "flow9",
      title: "Flow 9: Feedback Submission",
      icon: MessageSquare,
      description: "Share feedback to improve the learning experience",
      actors: ["Student"],
      steps: [
        {
          actor: "Student",
          action: "Navigate to Feedback",
          route: "/student/feedback",
          details: "From the 'More' dropdown menu, select 'Feedback'.",
        },
        {
          actor: "Student",
          action: "Select Category",
          route: "-",
          details: "Choose feedback category: Course Content, Instructor, Facilities, Platform, or Other.",
        },
        {
          actor: "Student",
          action: "Rate Experience",
          route: "-",
          details: "Select a rating from 1-5 stars.",
        },
        {
          actor: "Student",
          action: "Write Feedback",
          route: "-",
          details: "Enter detailed feedback and any suggestions for improvement.",
        },
        {
          actor: "Student",
          action: "Submit",
          route: "-",
          details: "Click 'Submit Feedback'. Confirmation appears and feedback is saved.",
        },
      ],
      testCredentials: [
        { role: "Active Student", email: "student@demo.com", password: "Demo123!" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-4 md:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Badge className="mb-4">Documentation</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Knead & Frost Academy
            </h1>
            <h2 className="text-2xl md:text-3xl text-primary font-semibold mb-4">
              Complete Flow Walkthrough
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Step-by-step guide for all 9 operational flows covering student enrollment, 
              class management, assessments, certifications, and more.
            </p>
          </div>

          {/* Demo Credentials Summary */}
          <Card className="p-6 mb-8 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Demo Accounts for Testing
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className="font-semibold text-sm text-muted-foreground">Student (Active)</p>
                <p className="font-mono text-sm">student@demo.com</p>
                <p className="font-mono text-sm text-muted-foreground">Demo123!</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="font-semibold text-sm text-muted-foreground">Chef</p>
                <p className="font-mono text-sm">chef@demo.com</p>
                <p className="font-mono text-sm text-muted-foreground">Chef123!</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="font-semibold text-sm text-muted-foreground">Super Admin</p>
                <p className="font-mono text-sm">superadmin@demo.com</p>
                <p className="font-mono text-sm text-muted-foreground">SuperAdmin123!</p>
              </div>
            </div>
          </Card>

          {/* Flow Tabs */}
          <Tabs defaultValue="flow1" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start">
              {flows.map((flow, index) => (
                <TabsTrigger 
                  key={flow.id} 
                  value={flow.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Flow {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {flows.map((flow) => (
              <TabsContent key={flow.id} value={flow.id}>
                <Card className="p-6 border-border/60">
                  {/* Flow Header */}
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <flow.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{flow.title}</h3>
                      <p className="text-muted-foreground mb-3">{flow.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {flow.actors.map((actor) => (
                          <Badge key={actor} variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {actor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-4 mb-6">
                    <h4 className="font-semibold text-lg">Steps</h4>
                    {flow.steps.map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          {index < flow.steps.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {step.actor}
                            </Badge>
                            <span className="font-semibold">{step.action}</span>
                            {step.route !== "-" && (
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                {step.route}
                              </code>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rules/Conditions if present */}
                  {flow.rules && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">Important Rules</h4>
                      <ul className="space-y-1">
                        {flow.rules.map((rule, i) => (
                          <li key={i} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                            <span>•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {flow.conditions && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">Eligibility Conditions</h4>
                      <ul className="space-y-1">
                        {flow.conditions.map((condition, i) => (
                          <li key={i} className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>{condition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Test Credentials */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-3">Test Credentials</h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {flow.testCredentials.map((cred, i) => (
                        <div key={i} className="p-3 bg-background rounded border text-sm">
                          <p className="font-medium text-muted-foreground mb-1">{cred.role}</p>
                          <p className="font-mono">{cred.email}</p>
                          <p className="font-mono text-muted-foreground">{cred.password}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Quick Reference */}
          <Card className="p-6 mt-8 border-border/60">
            <h3 className="text-xl font-bold mb-4">Quick Reference: All Flows</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {flows.map((flow, index) => (
                <div key={flow.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <flow.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Flow {index + 1}</p>
                    <p className="text-xs text-muted-foreground">{flow.title.replace(`Flow ${index + 1}: `, '')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FlowWalkthrough;
