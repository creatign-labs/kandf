import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'chef' | 'student' | 'super_admin' | 'vendor';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [requiredRole]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate('/login');
        return;
      }

      // Fetch profile for status checks
      const { data: profile } = await supabase
        .from('profiles')
        .select('enrollment_status, must_change_password')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setAccountStatus(profile.enrollment_status);
        setMustChangePassword(profile.must_change_password || false);

        // Handle enrollment status redirects for students - STATE-BASED ROUTING
        if (requiredRole === 'student') {
          // Handle on_hold status
          if (profile.enrollment_status === 'on_hold') {
            navigate('/student/account-hold');
            return;
          }

          // Handle cancelled status (previously rejected)
          if (profile.enrollment_status === 'cancelled') {
            navigate('/student/account-rejected');
            return;
          }

          // Handle enrolled status (not yet activated) - redirect to awaiting approval
          if (profile.enrollment_status === 'enrolled') {
            navigate('/student/awaiting-approval');
            return;
          }

          // Handle completed status - read-only access to dashboard
          // Students with 'completed' status can still view their course materials
          // but cannot book new slots (handled at component level)
          
          // For active and completed students - allow access to dashboard
          // Password change is OPTIONAL - no forced redirect
        }

        // Handle vendor approval status
        if (requiredRole === 'vendor') {
          // Check vendor profile approval status
          const { data: vendorProfile } = await supabase
            .from('vendor_profiles')
            .select('approval_status, is_active')
            .eq('user_id', session.user.id)
            .single();

          if (vendorProfile && vendorProfile.approval_status !== 'approved') {
            navigate('/vendor/awaiting-approval');
            return;
          }
        }
      }

      if (requiredRole) {
        // Check if user has the required role or is super_admin (super_admin has access to admin routes)
        type AppRole = 'admin' | 'chef' | 'student' | 'super_admin' | 'vendor';
        const rolesToCheck: AppRole[] = requiredRole === 'admin' 
          ? ['admin', 'super_admin'] 
          : [requiredRole as AppRole];
        
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .in('role', rolesToCheck);
        
        if (roleError || !roles || roles.length === 0) {
          // Redirect based on what roles they DO have
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);
          
          if (userRoles && userRoles.length > 0) {
            const firstRole = userRoles[0].role;
            // Map super_admin to admin route
            const route = firstRole === 'super_admin' ? 'admin' : firstRole;
            navigate(`/${route}`);
          } else {
            navigate('/');
          }
          return;
        }
      }

      setAuthorized(true);
    } catch (err) {
      console.error('Auth check error:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;
  
  return <>{children}</>;
};
