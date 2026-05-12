import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, Clock, Target, Loader2, Calendar, 
  CreditCard, AlertTriangle, ChefHat, ArrowRight,
  CheckCircle, Ban, MonitorPlay
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { countRecipesForCourse, fetchRecipeIdsForCourse } from "@/lib/courseRecipes";
import { format, isPast, parseISO } from "date-fns";

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

  // Fetch user's active enrollment with course
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['my-enrollment-dashboard'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipe progress
  const { data: recipeProgress } = useQuery({
    queryKey: ['recipe-progress-dashboard', enrollment?.course_id],
    queryFn: async () => {
      if (!enrollment?.course_id) return { total: 0, completed: 0 };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, completed: 0 };

      const totalCount = await countRecipesForCourse(enrollment.course_id);
      const courseRecipeIds = await fetchRecipeIdsForCourse(enrollment.course_id);

      let completedCount = 0;
      if (courseRecipeIds.length > 0) {
        const { count } = await supabase
          .from('student_recipe_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('status', 'completed')
          .in('recipe_id', courseRecipeIds);
        completedCount = count || 0;
      }

      return { total: totalCount, completed: completedCount };
    },
    enabled: !!enrollment?.course_id
  });

  // Fetch next upcoming booking
  const { data: nextBooking } = useQuery({
    queryKey: ['next-upcoming-booking'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          recipes(title),
          courses(title)
        `)
        .eq('student_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', today)
        .order('booking_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data;
    }
  });

  // Fetch payment summary
  const { data: paymentSummary } = useQuery({
    queryKey: ['payment-summary-dashboard'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: schedules, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

      if (error || !schedules) return null;

      const totalFee = schedules.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidAmount = schedules.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = totalFee - paidAmount;
      const nextDue = schedules.find(p => p.status !== 'paid');
      const overduePayments = schedules.filter(p => 
        p.status !== 'paid' && isPast(new Date(p.due_date))
      );

      return { totalFee, paidAmount, outstanding, nextDue, overdueCount: overduePayments.length };
    }
  });

  // Fetch no-show count for alerts
  const { data: noShowCount } = useQuery({
    queryKey: ['no-show-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'no_show');
      if (error) return 0;
      return count || 0;
    }
  });

  const firstName = profile?.first_name || 'Student';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  
  const isLocked = profile?.enrollment_status?.startsWith('locked') || false;
  const isActive = profile?.enrollment_status === 'active';
  const isCompleted = profile?.enrollment_status === 'completed';

  const totalRecipes = recipeProgress?.total || 0;
  const completedRecipes = recipeProgress?.completed || 0;
  const remainingRecipes = totalRecipes - completedRecipes;
  const progressPercent = totalRecipes > 0 ? Math.round((completedRecipes / totalRecipes) * 100) : 0;

  // Determine if booking is allowed
  const canBook = isActive && remainingRecipes > 0;

  if (enrollmentLoading) {
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
        {/* Welcome & Quick Action */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">Welcome to your learning dashboard</p>
          </div>
          {canBook && (
            <Button asChild>
              <Link to="/student/my-bookings">
                <Calendar className="h-4 w-4 mr-2" />
                Book Slot
              </Link>
            </Button>
          )}
        </div>

        {/* Alerts Section */}
        {(isLocked || (noShowCount !== undefined && noShowCount >= 2) || (paymentSummary?.overdueCount ?? 0) > 0) && (
          <div className="space-y-3 mb-6">
            {isLocked && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Account Restricted</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.enrollment_status === 'locked_no_show' && 'Your account has been locked due to 3+ no-shows. Contact admin to unlock.'}
                    {profile?.enrollment_status === 'locked_course_expired' && 'Your course has expired. Contact admin for extension.'}
                    {profile?.enrollment_status === 'locked_admin' && 'Your account has been locked by admin. Contact admin for details.'}
                  </p>
                </div>
              </div>
            )}
            {!isLocked && noShowCount !== undefined && noShowCount >= 2 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">No-Show Warning</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    You have {noShowCount} no-show(s). At 3 no-shows your account will be locked automatically.
                  </p>
                </div>
              </div>
            )}
            {(paymentSummary?.overdueCount ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Overdue Payment</p>
                  <p className="text-sm text-muted-foreground">
                    You have {paymentSummary?.overdueCount} overdue installment(s). Please clear your dues.
                  </p>
                </div>
                <Button size="sm" variant="destructive" asChild>
                  <Link to="/student/course-payment">Pay Now</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Next Upcoming Batch */}
          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              <span>Next Session</span>
            </div>
            {nextBooking ? (
              <div>
                <h3 className="font-semibold mb-1">{nextBooking.recipes?.title || 'Recipe Session'}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(nextBooking.booking_date), 'EEE, MMM d')} • {nextBooking.time_slot}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming sessions</p>
            )}
          </Card>

          {/* Course Progress */}
          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Target className="h-4 w-4" />
              <span>Course Progress</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{progressPercent}%</span>
              <span className="text-sm text-muted-foreground">
                {completedRecipes}/{totalRecipes} recipes
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </Card>

          {/* Payment Summary */}
          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <CreditCard className="h-4 w-4" />
              <span>Payments</span>
            </div>
            {paymentSummary ? (
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold">₹{paymentSummary.paidAmount.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/ ₹{paymentSummary.totalFee.toLocaleString()}</span>
                </div>
                {paymentSummary.outstanding > 0 && paymentSummary.nextDue && (
                  <p className="text-xs text-muted-foreground">
                    Next due: {format(new Date(paymentSummary.nextDue.due_date), 'MMM d')}
                  </p>
                )}
                {paymentSummary.outstanding === 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" /> Fully Paid
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payment schedule</p>
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active Course */}
            {enrollment && (
              <Card className="p-6 border-border/60">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {enrollment.status === 'completed' ? 'Completed' : 'Active Course'}
                    </Badge>
                    <h2 className="text-xl font-semibold">{enrollment.courses?.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{enrollment.courses?.description}</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/student/my-course">
                      View Course <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {enrollment.courses?.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-4 w-4" />
                    {completedRecipes} of {totalRecipes} recipes done
                  </span>
                  <span>{remainingRecipes} remaining</span>
                </div>
              </Card>
            )}

            {!enrollment && (
              <Card className="p-8 text-center border-border/60">
                <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                <Button asChild>
                  <Link to="/courses">Browse Courses</Link>
                </Button>
              </Card>
            )}

            {/* Quick Links */}
            <Card className="p-6 border-border/60">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
                  <Link to="/student/my-course">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-xs">My Course</span>
                  </Link>
                </Button>
                {canBook && (
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
                    <Link to="/student/my-bookings">
                      <Calendar className="h-5 w-5" />
                      <span className="text-xs">Book Slot</span>
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
                  <Link to="/student/course-payment">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Payments</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
                  <Link to="/student/online-classes">
                    <MonitorPlay className="h-5 w-5" />
                    <span className="text-xs">Online Classes</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Ring */}
            <Card className="p-6 border-border/60">
              <h3 className="font-semibold mb-4">Goals</h3>
              <div className="text-center py-4">
                <div className="relative inline-flex mb-4">
                  <svg className="h-28 w-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/20" />
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="none"
                      strokeDasharray={`${(progressPercent/100) * 2 * Math.PI * 48} ${2 * Math.PI * 48}`}
                      className="text-primary" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{progressPercent}%</div>
                      <div className="text-xs text-muted-foreground">complete</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p>{completedRecipes} recipes completed</p>
                  <p className="text-muted-foreground">{remainingRecipes} remaining</p>
                </div>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/student/my-course">View Details</Link>
                </Button>
              </div>
            </Card>

            {/* Notifications CTA */}
            <Card className="p-6 border-border/60">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/student/notifications">View Notifications</Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
