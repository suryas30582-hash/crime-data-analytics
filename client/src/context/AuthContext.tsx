import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { User } from '../types';
import { api } from '../services/api';

export type RoleType = 'admin' | 'police' | 'user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  role: RoleType | null;
  isAdmin: boolean;
  isPolice: boolean;
  isUser: boolean;
  isAuthenticated: boolean;
  hasRole: (role: RoleType) => boolean;
  login: (credentials: { email: string; password: string; expectedRole?: string }) => Promise<User>;
  citizenLogin: (data: { email: string }) => Promise<User>;
  sendOTP: (data: { email: string; expectedRole?: string }) => Promise<string>;
  verifyOTP: (data: { email: string; code: string; expectedRole?: string }) => Promise<User>;
  googleLogin: (data: { email: string; name?: string; credentialToken?: string; expectedRole?: string }) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: string;
    badge_number?: string;
    station?: string;
    department?: string;
    phone?: string;
  }) => Promise<User>;
  forgotPassword: (data: { email: string; newPassword?: string; confirmPassword?: string }) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const clerk = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('crime_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Clerk Session & User Metadata
  useEffect(() => {
    async function syncClerkUser() {
      if (!isLoaded) return;

      if (isSignedIn && clerkUser) {
        try {
          const sessionToken = (await getToken()) || localStorage.getItem('crime_auth_token') || 'clerk_session_token';
          localStorage.setItem('crime_auth_token', sessionToken);
          setToken(sessionToken);

          const clerkRole = (clerkUser.publicMetadata?.role as RoleType) || 'user';
          const clerkRoles = (clerkUser.publicMetadata?.roles as RoleType[]) || [clerkRole];

          const formattedUser: User = {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            role: clerkRole,
            roles: clerkRoles.includes('user') ? clerkRoles : [...clerkRoles, 'user'],
            badge_number: (clerkUser.publicMetadata?.badge_number as string) || null,
            station: (clerkUser.publicMetadata?.station as string) || null,
            department: (clerkUser.publicMetadata?.department as string) || null,
            phone: clerkUser.primaryPhoneNumber?.phoneNumber || null
          };

          setUser(formattedUser);
        } catch (err) {
          console.warn('Error syncing Clerk session:', err);
        } finally {
          setIsLoading(false);
        }
      } else if (!token) {
        setUser(null);
        setIsLoading(false);
      } else {
        // Fallback sync via backend API
        api.getMe()
          .then(data => setUser(data.user))
          .catch(() => {
            localStorage.removeItem('crime_auth_token');
            setToken(null);
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      }
    }

    syncClerkUser();
  }, [isLoaded, isSignedIn, clerkUser]);

  const login = async (credentials: { email: string; password: string; expectedRole?: string }): Promise<User> => {
    const res = await api.login(credentials);
    localStorage.setItem('crime_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const citizenLogin = async (data: { email: string }): Promise<User> => {
    const res = await api.citizenLogin(data);
    localStorage.setItem('crime_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const googleLogin = async (data: { email: string; name?: string; credentialToken?: string; expectedRole?: string }): Promise<User> => {
    const res = await api.googleLogin(data);
    localStorage.setItem('crime_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: string;
    badge_number?: string;
    station?: string;
    department?: string;
    phone?: string;
  }): Promise<User> => {
    const res = await api.register(data);
    localStorage.setItem('crime_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const forgotPassword = async (data: { email: string; newPassword?: string; confirmPassword?: string }) => {
    const res = await api.forgotPassword(data);
    return res.message;
  };

  const logout = () => {
    localStorage.removeItem('crime_auth_token');
    setToken(null);
    setUser(null);
    try {
      clerk.signOut();
    } catch {
      // ignore
    }
  };

  const hasRole = (checkRole: RoleType): boolean => {
    if (!user) return false;
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    if (userRoles.includes(checkRole)) return true;
    if (checkRole === 'user' && (userRoles.includes('admin') || userRoles.includes('police'))) return true;
    return false;
  };

  const currentRole = user?.role || null;

  const sendOTP = async (data: { email: string; expectedRole?: string }): Promise<string> => {
    const res = await api.sendOTP(data);
    return res.message;
  };

  const verifyOTP = async (data: { email: string; code: string; expectedRole?: string }): Promise<User> => {
    const res = await api.verifyOTP(data);
    localStorage.setItem('crime_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading: !isLoaded || isLoading,
        role: currentRole,
        isAdmin: hasRole('admin'),
        isPolice: hasRole('police'),
        isUser: hasRole('user'),
        isAuthenticated: !!user,
        hasRole,
        login,
        citizenLogin,
        sendOTP,
        verifyOTP,
        googleLogin,
        register,
        forgotPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
