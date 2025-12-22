import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ChefDashboard from "./pages/ChefDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Enroll from "./pages/Enroll";
import Enquiry from "./pages/Enquiry";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import MyCourse from "./pages/student/MyCourse";
import RecipeDetail from "./pages/student/RecipeDetail";
import BookSlot from "./pages/student/BookSlot";
import MyBookings from "./pages/student/MyBookings";
import Notifications from "./pages/student/Notifications";
import Assessments from "./pages/student/Assessments";
import Feedback from "./pages/student/Feedback";
import Certificates from "./pages/student/Certificates";
import Resume from "./pages/student/Resume";
import Jobs from "./pages/student/Jobs";
import Onboarding from "./pages/student/Onboarding";
import AwaitingApproval from "./pages/student/AwaitingApproval";
import Leads from "./pages/admin/Leads";
import Students from "./pages/admin/Students";
import AdminCourses from "./pages/admin/Courses";
import Inventory from "./pages/admin/Inventory";
import AdminNotifications from "./pages/admin/Notifications";
import Batches from "./pages/admin/Batches";
import Staff from "./pages/admin/Staff";
import DataTemplate from "./pages/admin/DataTemplate";
import StudentApprovals from "./pages/admin/StudentApprovals";
import InventoryChecklist from "./pages/admin/InventoryChecklist";
import RecipeIngredients from "./pages/admin/RecipeIngredients";
import AdminRecipes from "./pages/admin/AdminRecipes";
import Attendance from "./pages/chef/Attendance";
import ChefRecipes from "./pages/chef/Recipes";
import InventoryUsage from "./pages/chef/InventoryUsage";
import NotFound from "./pages/NotFound";
import Profile from "./pages/student/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/enroll/:courseId" element={<ProtectedRoute><Enroll /></ProtectedRoute>} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/awaiting-approval" element={<ProtectedRoute><AwaitingApproval /></ProtectedRoute>} />
          
          <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/my-course" element={<ProtectedRoute requiredRole="student"><MyCourse /></ProtectedRoute>} />
          <Route path="/student/recipes/:id" element={<ProtectedRoute requiredRole="student"><RecipeDetail /></ProtectedRoute>} />
          <Route path="/student/book-slot" element={<ProtectedRoute requiredRole="student"><BookSlot /></ProtectedRoute>} />
          <Route path="/student/my-bookings" element={<ProtectedRoute requiredRole="student"><MyBookings /></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute requiredRole="student"><Notifications /></ProtectedRoute>} />
          <Route path="/student/assessments" element={<ProtectedRoute requiredRole="student"><Assessments /></ProtectedRoute>} />
          <Route path="/student/feedback" element={<ProtectedRoute requiredRole="student"><Feedback /></ProtectedRoute>} />
          <Route path="/student/certificates" element={<ProtectedRoute requiredRole="student"><Certificates /></ProtectedRoute>} />
          <Route path="/student/resume" element={<ProtectedRoute requiredRole="student"><Resume /></ProtectedRoute>} />
          <Route path="/student/jobs" element={<ProtectedRoute requiredRole="student"><Jobs /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute requiredRole="student"><Profile /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/leads" element={<ProtectedRoute requiredRole="admin"><Leads /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute requiredRole="admin"><Students /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute requiredRole="admin"><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute requiredRole="admin"><Inventory /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute requiredRole="admin"><AdminNotifications /></ProtectedRoute>} />
          <Route path="/admin/batches" element={<ProtectedRoute requiredRole="admin"><Batches /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute requiredRole="admin"><Staff /></ProtectedRoute>} />
          <Route path="/admin/data-template" element={<ProtectedRoute requiredRole="admin"><DataTemplate /></ProtectedRoute>} />
          <Route path="/admin/student-approvals" element={<ProtectedRoute requiredRole="admin"><StudentApprovals /></ProtectedRoute>} />
          <Route path="/admin/inventory-checklist" element={<ProtectedRoute requiredRole="admin"><InventoryChecklist /></ProtectedRoute>} />
          <Route path="/admin/recipe-ingredients" element={<ProtectedRoute requiredRole="admin"><RecipeIngredients /></ProtectedRoute>} />
          <Route path="/admin/recipes" element={<ProtectedRoute requiredRole="admin"><AdminRecipes /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><Profile /></ProtectedRoute>} />
          
          <Route path="/chef" element={<ProtectedRoute requiredRole="chef"><ChefDashboard /></ProtectedRoute>} />
          <Route path="/chef/attendance" element={<ProtectedRoute requiredRole="chef"><Attendance /></ProtectedRoute>} />
          <Route path="/chef/recipes" element={<ProtectedRoute requiredRole="chef"><ChefRecipes /></ProtectedRoute>} />
          <Route path="/chef/inventory-usage" element={<ProtectedRoute requiredRole="chef"><InventoryUsage /></ProtectedRoute>} />
          <Route path="/chef/profile" element={<ProtectedRoute requiredRole="chef"><Profile /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
