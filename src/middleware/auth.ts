import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { staffUsers } from '../db/schema.ts';
import { or, sql } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS, type StaffPermissions } from '../types.ts';
import { verifySessionToken } from '../server/security.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    id?: number;
    email?: string;
    name?: string;
    role?: string;
    permissions?: StaffPermissions;
  };
}

/** Exact match on email or username. No wildcards. */
export async function findStaffByIdentifier(identifier: string) {
  const id = String(identifier || '').trim().toLowerCase();
  if (!id) return null;
  const rows = await db
    .select()
    .from(staffUsers)
    .where(or(sql`lower(${staffUsers.email}) = ${id}`, sql`lower(${staffUsers.username}) = ${id}`));
  if (rows.length === 0) return null;
  return rows.find((r) => (r.email || '').toLowerCase() === id) || rows[0];
}

export function buildPermissions(u: { role?: string | null; permissions?: string | null }): StaffPermissions {
  const role = u.role || 'Cashier';
  if (role.toLowerCase() === 'admin') {
    return { ...DEFAULT_ROLE_PERMISSIONS['Admin'] };
  }
  let parsed: Partial<StaffPermissions> = {};
  if (u.permissions) {
    try {
      parsed = JSON.parse(u.permissions);
    } catch {
      // ignore bad JSON
    }
  }
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
  return { ...defaults, ...parsed };
}

/**
 * Looks the person up in the staff table. People who are not in the table
 * are NOT created and NOT let in. Admins must add staff first.
 */
async function attachStaffRecord(req: AuthRequest): Promise<'ok' | 'missing' | 'error'> {
  const identifier = req.user?.email;
  if (!identifier) return 'missing';
  try {
    const u = await findStaffByIdentifier(identifier);
    if (!u) return 'missing';
    req.user!.id = u.id;
    req.user!.name = u.name || req.user!.name || identifier.split('@')[0];
    req.user!.role = u.role || 'Cashier';
    req.user!.permissions = buildPermissions(u);
    return 'ok';
  } catch (err) {
    console.error('Failed to resolve staff user from DB:', err);
    return 'error';
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  if (token.startsWith('staff-session:')) {
    const identifier = verifySessionToken(token);
    if (!identifier) {
      return res.status(401).json({ error: 'Unauthorized: Session is invalid or expired. Please log in again.' });
    }
    req.user = {
      uid: `staff_${identifier}`,
      email: identifier,
      name: identifier.split('@')[0],
    };
  } else {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (!decoded.email || decoded.email_verified === false) {
        return res.status(401).json({ error: 'Unauthorized: Google account has no verified email' });
      }
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0] || 'Staff User',
      };
    } catch (error: any) {
      const isExpired =
        error?.code === 'auth/id-token-expired' ||
        (error?.message && String(error.message).includes('id-token-expired'));
      if (isExpired) {
        return res.status(401).json({
          error: 'Unauthorized: Firebase ID token has expired',
          code: 'auth/id-token-expired',
        });
      }
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  const result = await attachStaffRecord(req);
  if (result === 'missing') {
    return res.status(403).json({ error: 'Forbidden: This account is not registered as staff. Please ask the admin.' });
  }
  if (result === 'error') {
    return res.status(503).json({ error: 'Service unavailable: could not check your account. Please try again.' });
  }
  return next();
};

/**
 * Same as requireAuth, but also accepts the token in ?token=...
 * Only used for the live notification stream, because the browser's
 * EventSource cannot send an Authorization header.
 */
export const requireAuthFromQuery = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers.authorization && typeof req.query.token === 'string' && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return requireAuth(req, res, next);
};

export const requirePermission = (permission: keyof StaffPermissions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions[permission] === true) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: You do not have permission to perform this action (${permission})`,
      requiredPermission: permission,
    });
  };
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
};
