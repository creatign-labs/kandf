import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'chef' | 'student' | 'super_admin';
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
        .select('account_status, must_change_password')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setAccountStatus(profile.account_status);
        setMustChangePassword(profile.must_change_password || false);

        // Handle account status redirects for students
        if (requiredRole === 'student') {
          // Handle on_hold status
          if (profile.account_status === 'on_hold') {
            navigate('/student/account-hold');
            return;
          }

          // Handle rejected status
          if (profile.account_status === 'rejected') {
            navigate('/student/account-rejected');
            return;
          }

          // Handle pending/advance_paid status - redirect to awaiting page
          if (profile.account_status !== 'active') {
            navigate('/student/awaiting-approval');
            return;
          }

          // Check if password change is required (for active accounts)
          if (profile.must_change_password) {
            navigate('/student/change-password');
            return;
          }
        }
      }

      if (requiredRole) {
        // Check if user has the required role or is super_admin (super_admin has access to admin routes)
        type AppRole = 'admin' | 'chef' | 'student' | 'super_admin';
        const rolesToCheck: AppRole[] = requiredRole === 'admin' 
          ? ['admin', 'super_admin'] 
          : [requiredRole];
        
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
