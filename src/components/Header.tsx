import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, User, ChefHat } from "lucide-react";
import { NavLink } from "@/components/NavLink";

interface HeaderProps {
  role?: "public" | "student" | "admin" | "chef";
  userName?: string;
}

export const Header = ({ role = "public", userName }: HeaderProps) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">Knead & Frost</span>
        </Link>

        {role === "public" && (
          <nav className="flex items-center gap-8">
            <NavLink to="/" end className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Home
            </NavLink>
            <NavLink to="/courses" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Courses
            </NavLink>
            <NavLink to="/about" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              About
            </NavLink>
            <NavLink to="/contact" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Contact
            </NavLink>
          </nav>
        )}

        {role === "student" && (
          <nav className="flex items-center gap-6">
            <NavLink to="/student" end className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Dashboard
            </NavLink>
            <NavLink to="/student/my-course" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              My Course
            </NavLink>
            <NavLink to="/student/book-slot" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Book Slot
            </NavLink>
            <NavLink to="/student/my-bookings" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Bookings
            </NavLink>
            <NavLink to="/student/assessments" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Assessments
            </NavLink>
            <NavLink to="/student/jobs" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Jobs
            </NavLink>
          </nav>
        )}

        {role === "admin" && (
          <nav className="flex items-center gap-6">
            <NavLink to="/admin" end className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Dashboard
            </NavLink>
            <NavLink to="/admin/leads" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Leads
            </NavLink>
            <NavLink to="/admin/students" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Students
            </NavLink>
            <NavLink to="/admin/courses" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Courses
            </NavLink>
            <NavLink to="/admin/batches" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Batches
            </NavLink>
            <NavLink to="/admin/inventory" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Inventory
            </NavLink>
            <NavLink to="/admin/notifications" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Notifications
            </NavLink>
          </nav>
        )}

        {role === "chef" && (
          <nav className="flex items-center gap-6">
            <NavLink to="/chef" end className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Today's Classes
            </NavLink>
            <NavLink to="/chef/attendance" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Attendance
            </NavLink>
            <NavLink to="/chef/recipes" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Recipes
            </NavLink>
            <NavLink to="/chef/inventory-usage" className="text-sm font-medium transition-colors hover:text-primary" activeClassName="text-primary">
              Inventory
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {role === "public" ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to={`/${role === 'admin' ? 'admin' : 'student'}/notifications`}>
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    3
                  </span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link to={`/${role}/profile`}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{userName || "User"}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};