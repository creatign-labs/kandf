import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, User, ChefHat, Menu, LogOut, Home, BookOpen, Calendar, Briefcase, ClipboardList, Users, Package, Settings, Award, FileText, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ProfileDropdown } from "@/components/ProfileDropdown";

interface HeaderProps {
  role?: "public" | "student" | "admin" | "chef";
  userName?: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

type AppRole = "admin" | "student" | "chef";

const publicNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/about", label: "About", icon: Users },
  { to: "/contact", label: "Contact", icon: MessageSquare },
];

const studentNavItems: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: Home, end: true },
  { to: "/student/my-course", label: "My Course", icon: BookOpen },
  { to: "/student/book-slot", label: "Book Slot", icon: Calendar },
  { to: "/student/my-bookings", label: "Bookings", icon: ClipboardList },
  { to: "/student/assessments", label: "Assessments", icon: FileText },
  { to: "/student/certificates", label: "Certificates", icon: Award },
  { to: "/student/jobs", label: "Jobs", icon: Briefcase },
  { to: "/student/resume", label: "Resume", icon: FileText },
  { to: "/student/feedback", label: "Feedback", icon: MessageSquare },
];

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: Home, end: true },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/batches", label: "Batches", icon: Calendar },
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/staff", label: "Staff", icon: Users },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

const chefNavItems = [
  { to: "/chef", label: "Today's Classes", icon: Home, end: true },
  { to: "/chef/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/chef/recipes", label: "Recipes", icon: BookOpen },
  { to: "/chef/inventory-usage", label: "Inventory", icon: Package },
];

export const Header = ({ role = "public", userName }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPrimaryRole, setUserPrimaryRole] = useState<AppRole | null>(null);

  useEffect(() => {
    // Only check auth status for public pages
    if (role === "public") {
      checkAuthStatus();
    }
  }, [role]);

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      // Fetch user's primary role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (roles && roles.length > 0) {
        // Priority: admin > chef > student
        if (roles.some(r => r.role === 'admin')) {
          setUserPrimaryRole('admin');
        } else if (roles.some(r => r.role === 'chef')) {
          setUserPrimaryRole('chef');
        } else {
          setUserPrimaryRole('student');
        }
      }
    }
  };

  const getDashboardPath = () => {
    if (userPrimaryRole === 'admin') return '/admin';
    if (userPrimaryRole === 'chef') return '/chef';
    return '/student';
  };

  const getNavItems = () => {
    switch (role) {
      case "student": return studentNavItems;
      case "admin": return adminNavItems;
      case "chef": return chefNavItems;
      default: return publicNavItems;
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate("/login");
    } catch (error) {
      toast({ title: "Error logging out", variant: "destructive" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <span className="text-lg md:text-xl font-bold tracking-tight">Knead & Frost</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className="text-sm font-medium transition-colors hover:text-primary" 
              activeClassName="text-primary"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-2 md:gap-3">
          {role === "public" ? (
            isLoggedIn && userPrimaryRole ? (
              <Button size="sm" asChild>
                <Link to={getDashboardPath()}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )
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
              <ProfileDropdown role={role} />
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {role !== "public" && (
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to={`/${role === 'admin' ? 'admin' : 'student'}/notifications`}>
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  3
                </span>
              </Link>
            </Button>
          )}
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-6 w-6 text-primary" />
                    <span className="font-bold">Knead & Frost</span>
                  </div>
                </div>

                {/* User Info for logged in users */}
                {role !== "public" && (
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{userName || "User"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{role} Portal</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>

                  {/* Additional Links for logged in users */}
                  {role !== "public" && (
                    <div className="mt-6 pt-6 border-t space-y-1">
                      <SheetClose asChild>
                        <Link
                          to={`/${role}/profile`}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted"
                        >
                          <Settings className="h-4 w-4" />
                          Profile Settings
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-4 border-t mt-auto">
                  {role === "public" ? (
                    isLoggedIn && userPrimaryRole ? (
                      <SheetClose asChild>
                        <Button className="w-full gap-2" asChild>
                          <Link to={getDashboardPath()}>
                            <LayoutDashboard className="h-4 w-4" />
                            Back to Dashboard
                          </Link>
                        </Button>
                      </SheetClose>
                    ) : (
                      <div className="space-y-2">
                        <SheetClose asChild>
                          <Button variant="outline" className="w-full" asChild>
                            <Link to="/login">Log In</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button className="w-full" asChild>
                            <Link to="/signup">Sign Up</Link>
                          </Button>
                        </SheetClose>
                      </div>
                    )
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
