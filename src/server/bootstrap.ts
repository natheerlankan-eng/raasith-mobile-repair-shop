import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { staffUsers } from '../db/schema.ts';
import { DEFAULT_ROLE_PERMISSIONS } from '../types.ts';
import { hashPassword, isHashed } from './security.ts';

/**
 * Runs once when the server starts.
 * 1. Turns any old plain text passwords into hashed ones.
 * 2. Creates the first admin from ADMIN_EMAIL + ADMIN_PASSWORD if that person
 *    does not exist yet. Set ADMIN_RESET_PASSWORD=true to also reset the
 *    password of an existing admin (use it once if you are locked out, then remove it).
 */
export async function secureStaffAccounts() {
  const rows = await db.select().from(staffUsers);

  let migrated = 0;
  for (const r of rows) {
    if (r.password && !isHashed(r.password)) {
      await db
        .update(staffUsers)
        .set({ password: await hashPassword(String(r.password).trim()) })
        .where(eq(staffUsers.id, r.id));
      migrated += 1;
    }
  }
  if (migrated > 0) console.log(`Security: hashed ${migrated} plain text staff password(s).`);

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (!adminEmail || !adminPassword) return;

  if (adminPassword.length < 8) {
    console.warn('Security: ADMIN_PASSWORD is shorter than 8 characters. Ignoring it.');
    return;
  }

  const username = adminEmail.replace(/@.*/, '');
  const existing = rows.find(
    (r) => (r.email || '').toLowerCase() === adminEmail || (r.username || '').toLowerCase() === username
  );

  if (!existing) {
    await db.insert(staffUsers).values({
      email: adminEmail,
      username,
      password: await hashPassword(adminPassword),
      name: username,
      role: 'Admin',
      permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Admin']),
    });
    console.log(`Security: created admin account for ${adminEmail}.`);
  } else if (process.env.ADMIN_RESET_PASSWORD === 'true') {
    await db
      .update(staffUsers)
      .set({ password: await hashPassword(adminPassword), role: 'Admin', updatedAt: new Date() })
      .where(eq(staffUsers.id, existing.id));
    console.log(`Security: reset password for admin ${adminEmail}.`);
  }
}
