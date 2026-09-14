import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#070b16]">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-pulse">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-xs font-mono text-amber-400">Verifying administrative access privileges...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
