import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import firebaseConfig from '../lib/firebaseConfig.ts';
import { db } from '../db/index.ts';
import { staffUsers } from '../db/schema.ts';
import { eq, or, ilike } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS, type StaffPermissions } from '../types.ts';

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

async function attachUserRoleAndPermissions(req: AuthRequest) {
  if (!req.user?.email) return;
  const cleanEmail = req.user.email.trim().toLowerCase();
  try {
    const rows = await db
      .select()
      .from(staffUsers)
      .where(or(ilike(staffUsers.email, cleanEmail), ilike(staffUsers.username, cleanEmail)));
    if (rows.length > 0) {
      const u = rows[0];
      req.user.id = u.id;
      req.user.name = u.name || req.user.name || cleanEmail.split('@')[0];
      req.user.role = u.role || 'Cashier';
      let parsedPerms: Partial<StaffPermissions> = {};
      if (u.permissions) {
        try {
          parsedPerms = JSON.parse(u.permissions);
        } catch {
          // ignore
        }
      }
      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
      req.user.permissions = {
        ...roleDefaults,
        ...parsedPerms,
      };
      if (u.role?.toLowerCase() === 'admin') {
        req.user.permissions = { ...DEFAULT_ROLE_PERMISSIONS['Admin'] };
      }
    } else {
      const allCount = await db.select({ id: staffUsers.id }).from(staffUsers).limit(2);
      const isFirst = allCount.length === 0;
      const assignedRole = isFirst || cleanEmail === 'natheerlankan@gmail.com' ? 'Admin' : 'Cashier';
      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[assignedRole];
      const inserted = await db.insert(staffUsers).values({
        email: cleanEmail,
        name: req.user.name || cleanEmail.split('@')[0],
        role: assignedRole,
        permissions: JSON.stringify(roleDefaults),
      }).returning();
      req.user.id = inserted[0]?.id;
      req.user.role = assignedRole;
      req.user.permissions = roleDefaults;
    }
  } catch (err) {
    console.warn('Failed to resolve staff user permissions from DB:', err);
    req.user.role = req.user.role || (cleanEmail === 'natheerlankan@gmail.com' ? 'Admin' : 'Cashier');
    req.user.permissions = DEFAULT_ROLE_PERMISSIONS[req.user.role] || DEFAULT_ROLE_PERMISSIONS['Cashier'];
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  // Handle staff session token
  if (token.startsWith('staff-session:')) {
    try {
      const email = Buffer.from(token.replace('staff-session:', ''), 'base64').toString('utf-8');
      if (email && email.trim().length > 0) {
        req.user = {
          uid: `staff_${email}`,
          email,
          name: email.split('@')[0],
        };
        await attachUserRoleAndPermissions(req);
        return next();
      }
    } catch {
      // Fall through to Firebase verification
    }
  }

  // Handle Firebase token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Staff User',
    };
    await attachUserRoleAndPermissions(req);
    return next();
  } catch (error: any) {
    const isExpired = error?.code === 'auth/id-token-expired' || (error?.message && error.message.includes('id-token-expired'));

    if (isExpired) {
      try {
        // Fallback: Check if token belongs to this app's Firebase project
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          const matchesProject =
            payload?.aud === firebaseConfig.projectId ||
            payload?.iss?.includes(firebaseConfig.projectId);

          if (matchesProject && payload?.email) {
            req.user = {
              uid: payload.uid || payload.user_id || payload.sub,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0] || 'Staff User',
            };
            await attachUserRoleAndPermissions(req);
            return next();
          }
        }
      } catch (decodeErr) {
        // Fall through to 401
      }

      console.warn('Firebase ID token expired. Prompting client token refresh.');
      return res.status(401).json({
        error: 'Unauthorized: Firebase ID token has expired',
        code: 'auth/id-token-expired',
      });
    }

    console.error('Error verifying Firebase ID token:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
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

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
};
