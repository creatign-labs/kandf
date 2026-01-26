import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, BookOpen, ChevronDown, Shield, ChefHat, GraduationCap, Calendar, CreditCard, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";

interface ProfileDropdownProps {
  role: "student" | "admin" | "chef" | "super_admin" | "vendor";
}

interface ProfileData {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Enrollment {
  id: string;
  status: string;
  progress: number | null;
  student_code: string | null;
  courses: {
    title: string;
    duration: string;
  } | null;
  batches: {
    start_date: string | null;
  } | null;
}

type AppRole = "admin" | "student" | "chef" | "super_admin" | "vendor";

const roleConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; path: string }> = {
  admin: { icon: Shield, label: "Admin Portal", path: "/admin" },
  chef: { icon: ChefHat, label: "Chef Portal", path: "/chef" },
  student: { icon: GraduationCap, label: "Student Portal", path: "/student" },
  super_admin: { icon: Shield, label: "Admin Portal", path: "/admin" },
  vendor: { icon: Shield, label: "Vendor Portal", path: "/vendor" },
};

export const ProfileDropdown = ({ role }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, bio')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesData) {
        setUserRoles(rolesData.map(r => r.role as AppRole));
      }

      // Fetch enrollments (only for students)
      if (role === 'student') {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('id, status, progress, student_code, courses(title, duration), batches(start_date)')
          .eq('student_id', user.id);

        if (enrollmentsData) {
          setEnrollments(enrollmentsData as Enrollment[]);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate("/login");
    } catch (error) {
      toast({ title: "Error logging out", variant: "destructive" });
    }
  };

  const handleSwitchRole = (newRole: AppRole) => {
    navigate(roleConfig[newRole].path);
  };

  const getInitials = () => {
    if (!profile) return "U";
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || "U";
  };

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "User";
  const activeCourses = enrollments.filter(e => e.status === 'active');
  const completedCourses = enrollments.filter(e => e.status === 'completed' || e.progress === 100);
  // Get the student code from the first active enrollment
  const studentCode = activeCourses[0]?.student_code || enrollments[0]?.student_code;
  // Filter out super_admin from portal switching (it uses admin portal) and current role
  const otherRoles = userRoles.filter(r => r !== role && r !== 'super_admin' && roleConfig[r]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden lg:inline max-w-[120px] truncate">
            {fullName}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {/* Profile Header */}
        <div className="p-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{fullName}</p>
              {role === 'student' && studentCode ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IdCard className="h-3 w-3" />
                  <span className="font-mono">{studentCode}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              )}
              {profile?.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Role Switcher (only if user has multiple roles) */}
        {otherRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Switch Portal</p>
              <div className="space-y-1">
                {otherRoles.map((r) => {
                  const config = roleConfig[r];
                  const Icon = config.icon;
                  return (
                    <button
                      key={r}
                      onClick={() => handleSwitchRole(r)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Course Stats (Student only) */}
        {role === 'student' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">My Courses</p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex-1 justify-center py-1">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {activeCourses.length} Active
                </Badge>
                <Badge variant="outline" className="flex-1 justify-center py-1 text-green-600 border-green-200 bg-green-50">
                  {completedCourses.length} Completed
                </Badge>
              </div>
              {activeCourses.length > 0 && (
                <div className="mt-2 space-y-1">
                  {activeCourses.slice(0, 2).map((enrollment) => {
                    // Calculate course dates - duration is like "3 months", "4 months", etc.
                    const startDate = enrollment.batches?.start_date 
                      ? new Date(enrollment.batches.start_date) 
                      : null;
                    const durationStr = enrollment.courses?.duration || "";
                    const durationMonths = parseInt(durationStr.match(/\d+/)?.[0] || "3");
                    const endDate = startDate 
                      ? addMonths(startDate, durationMonths)
                      : null;

                    return (
                      <div key={enrollment.id} className="text-xs p-2 bg-muted/50 rounded-md">
                        <p className="font-medium truncate">{enrollment.courses?.title}</p>
                        {startDate && (
                          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(startDate, 'MMM d, yyyy')} - {endDate ? format(endDate, 'MMM d, yyyy') : 'TBD'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${enrollment.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground">{enrollment.progress || 0}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Course Payment - Only for active students */}
        {role === 'student' && (
          <DropdownMenuItem asChild>
            <Link to="/student/course-payment" className="cursor-pointer">
              <CreditCard className="h-4 w-4 mr-2" />
              Course Payment
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem asChild>
          <Link to={`/${role === 'super_admin' ? 'admin' : role}/profile`} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
