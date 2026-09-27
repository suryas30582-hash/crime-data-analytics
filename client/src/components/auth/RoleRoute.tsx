import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, RoleType } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#883A2E] border-t-transparent shadow-sm"></div>
        <p className="text-xs font-medium text-[#7A6360]">Verifying Role-Based Access Privileges...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if any allowed role matches user's single or multi-roles
  const isAllowed = allowedRoles.some((role) => hasRole(role));

  if (isAllowed) {
    return <>{children}</>;
  }

  // Mismatched role: redirect to user's highest assigned dashboard
  const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const fallbackDestination = userRoles.includes('admin')
    ? '/admin/dashboard'
    : userRoles.includes('police')
    ? '/police/dashboard'
    : '/user/dashboard';

  return <Navigate to={fallbackDestination} replace />;
};
