import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@clerk/backend';

const JWT_SECRET = process.env.JWT_SECRET || 'crimelytixs_secure_jwt_token_secret_2026_rbac';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_clerk_secret_key_crime_analytics';

export type UserRole = 'admin' | 'police' | 'user';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    roles?: UserRole[];
    badge_number?: string | null;
    station?: string | null;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No authorization token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // 1. Try Clerk Token Verification
  try {
    const verified = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY
    });

    if (verified && verified.sub) {
      const metadata = (verified.metadata || {}) as any;
      const role = (metadata.role as UserRole) || 'user';
      const roles = (metadata.roles as UserRole[]) || [role];

      req.user = {
        id: verified.sub,
        email: (verified.email as string) || 'user@clerk.user',
        name: (verified.name as string) || 'Clerk User',
        role,
        roles: roles.includes('user') ? roles : [...roles, 'user'],
        badge_number: metadata.badge_number || null,
        station: metadata.station || null
      };
      return next();
    }
  } catch (clerkErr) {
    // Fallthrough to standard JWT verification
  }

  // 2. Try Standard System JWT Verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      roles?: UserRole[];
      badge_number?: string | null;
      station?: string | null;
    };
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token. Please sign in again.' });
  }
}

export async function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const verified = await verifyToken(token, {
        secretKey: CLERK_SECRET_KEY
      });

      if (verified && verified.sub) {
        const metadata = (verified.metadata || {}) as any;
        const role = (metadata.role as UserRole) || 'user';
        const roles = (metadata.roles as UserRole[]) || [role];

        req.user = {
          id: verified.sub,
          email: (verified.email as string) || 'user@clerk.user',
          name: (verified.name as string) || 'Clerk User',
          role,
          roles: roles.includes('user') ? roles : [...roles, 'user'],
          badge_number: metadata.badge_number || null,
          station: metadata.station || null
        };
        return next();
      }
    } catch {
      // ignore
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        roles?: UserRole[];
        badge_number?: string | null;
        station?: string | null;
      };
      req.user = decoded;
    } catch {
      // Ignore invalid token on optional routes
    }
  }
  next();
}

/**
 * Role-Based Access Control Middleware
 * Admin always has super-user combined access across all workflows.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Admin has combined super-user access
    if (req.user.role === 'admin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Privileges required: [${allowedRoles.join(', ')}]. Your current role is: [${req.user.role}].`
    });
  };
}

export const requireAdmin = requireRole('admin');
export const requirePolice = requireRole('police');
export const requireUser = requireRole('user');
export const requirePoliceOrAdmin = requireRole('police', 'admin');
export const requireUserOrAdmin = requireRole('user', 'admin');

export function generateToken(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: UserRole[];
  badge_number?: string | null;
  station?: string | null;
}) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: user.roles || [user.role],
      badge_number: user.badge_number || null,
      station: user.station || null
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
