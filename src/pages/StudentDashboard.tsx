import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Clock, Target, Bell, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCourseImage } from "@/lib/courseImages";

const StudentDashboard = () => {
  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch user's enrollments with courses
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch available courses for new enrollment
  const { data: courses } = useQuery({
    queryKey: ['available-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .limit(4);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch notifications count
  const { data: notificationsCount } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) return 0;
      return count || 0;
    }
  });

  // Fetch certificates count
  const { data: certificatesCount } = useQuery({
    queryKey: ['certificates-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id);
      
      if (error) return 0;
      return count || 0;
    }
  });

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];
  const completedEnrollments = enrollments?.filter(e => e.status === 'completed') || [];
  const averageProgress = activeEnrollments.length > 0
    ? Math.round(activeEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / activeEnrollments.length)
    : 0;

  const firstName = profile?.first_name || 'Student';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" userName={firstName} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" userName={firstName} />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{greeting}, {firstName} 👋</h1>
            <p className="text-sm md:text-base text-muted-foreground">Welcome to Knead & Frost, check your priority learning.</p>
          </div>
          <Button asChild className="w-fit">
            <Link to="/student/resume">
              <FileText className="h-4 w-4 mr-2" />
              Build Resume
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        {/* Stats Row - Course Progress and Active Courses side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-3 md:mb-6">
          <StatsCard
            title="Course Progress"
            value={`${averageProgress}%`}
            icon={Target}
            variant="primary"
          />
          <StatsCard
            title="Active Courses"
            value={String(activeEnrollments.length)}
            icon={BookOpen}
            variant="default"
          />
        </div>
        
        {/* Quick Actions and Notifications - 2 column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Quick Actions - Left */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/student/my-bookings">
                  <Clock className="h-4 w-4 mr-2" />
                  Book a Class
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/student/my-course">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Course Recipes
                </Link>
              </Button>
            </div>
          </Card>

          {/* Notifications - Right */}
          {notificationsCount && notificationsCount > 0 ? (
            <Card className="p-6 bg-gradient-to-r from-success/10 via-background to-background border-success/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge className="mb-3 bg-success text-success-foreground">
                    {notificationsCount} New
                  </Badge>
                  <h3 className="font-semibold text-lg mb-2">You have unread notifications</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check your notifications for important updates about your courses and bookings.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/student/notifications">View Notifications →</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Notifications</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You're all caught up! No new notifications.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/student/notifications">View All →</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* In Progress Courses */}
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold mb-1">In progress learning content</h2>
                  <p className="text-xs md:text-sm text-muted-foreground">Continue where you left off</p>
                </div>
                <Button variant="link" size="sm" asChild>
                  <Link to="/student/my-course">View all</Link>
                </Button>
              </div>

              {activeEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {activeEnrollments.slice(0, 2).map((enrollment) => (
                    <Card key={enrollment.id} className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div 
                          className="h-32 sm:h-20 sm:w-32 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ 
                            backgroundImage: `url(${getCourseImage(enrollment.course_id, '', enrollment.courses?.title || '')})`
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="mb-2">
                            <BookOpen className="h-3 w-3 mr-1" />
                            Course
                          </Badge>
                          <h3 className="font-semibold mb-1 text-sm md:text-base">{enrollment.courses?.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground mt-2 md:mt-3">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                              {enrollment.courses?.materials_count || 0} Materials
                            </span>
                            <span className={enrollment.progress && enrollment.progress > 50 ? "text-success" : ""}>
                              {enrollment.progress || 0}% Complete
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 md:h-4 md:w-4" />
                              {enrollment.courses?.duration}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" asChild>
                          <Link to="/student/my-course">
                            {enrollment.progress && enrollment.progress > 0 ? 'Continue' : 'Start'}
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                  <Button asChild>
                    <Link to="/courses">Browse Courses</Link>
                  </Button>
                </Card>
              )}
            </div>

            {/* Available Courses */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Explore more courses</h2>
                <Button variant="link" asChild>
                  <Link to="/courses">View all</Link>
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {courses?.slice(0, 2).map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    image={getCourseImage(course.id, '', course.title)}
                    duration={course.duration}
                    materials={course.materials_count || 0}
                    level={course.level}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Goals Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Goals</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to="/student/notifications">
                    <Bell className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="relative inline-flex mb-4">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted/20"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(averageProgress/100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                        className="text-success"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{averageProgress}%</div>
                        <div className="text-xs text-muted-foreground">progress</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {activeEnrollments.length} Active Course{activeEnrollments.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {completedEnrollments.length} Completed
                    </div>
                    <Button variant="link" size="sm" className="text-primary" asChild>
                      <Link to="/student/my-course">See Detail</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;