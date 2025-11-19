import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
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
import Leads from "./pages/admin/Leads";
import Students from "./pages/admin/Students";
import AdminCourses from "./pages/admin/Courses";
import Inventory from "./pages/admin/Inventory";
import Attendance from "./pages/chef/Attendance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/enroll/:id" element={<Enroll />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/my-course" element={<MyCourse />} />
          <Route path="/student/recipes/:id" element={<RecipeDetail />} />
          <Route path="/student/book-slot" element={<BookSlot />} />
          <Route path="/student/my-bookings" element={<MyBookings />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/assessments" element={<Assessments />} />
          <Route path="/student/feedback" element={<Feedback />} />
          <Route path="/student/certificates" element={<Certificates />} />
          <Route path="/student/resume" element={<Resume />} />
          <Route path="/student/jobs" element={<Jobs />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/leads" element={<Leads />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/chef" element={<ChefDashboard />} />
          <Route path="/chef/attendance" element={<Attendance />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
