import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number
) => Promise<Buffer>;

// ---------------------------------------------------------------------------
// Session secret. This is the key that makes login tokens impossible to fake.
// In production the app refuses to start without it.
// ---------------------------------------------------------------------------
let SESSION_SECRET = (process.env.SESSION_SECRET || '').trim();
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not set. Refusing to start without it.');
  }
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set. Using a temporary one. Everyone is logged out on every restart.');
} else if (process.env.NODE_ENV === 'production' && SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET is too short. Use at least 32 characters.');
}

const SESSION_TTL_MS = 16 * 60 * 60 * 1000; // 16 hours, covers one full shift
const TOKEN_PREFIX = 'staff-session:';

function sign(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export function signSessionToken(identifier: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: identifier, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  return `${TOKEN_PREFIX}${payload}.${sign(payload)}`;
}

/** Returns the staff identifier if the token is real and not expired. Otherwise null. */
export function verifySessionToken(token: string): string | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dot = body.lastIndexOf('.');
  if (dot < 1) return null;

  const payload = body.slice(0, dot);
  const given = Buffer.from(body.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.u !== 'string' || !data.u) return null;
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Passwords. Stored as scrypt$salt$hash. Old plain text values still verify
// once, then the caller re-saves them hashed.
// ---------------------------------------------------------------------------
const HASH_PREFIX = 'scrypt$';

export function isHashed(stored: unknown): boolean {
  return typeof stored === 'string' && stored.startsWith(HASH_PREFIX);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(plain, salt, 64);
  return `${HASH_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<{ ok: boolean; legacy: boolean }> {
  if (isHashed(stored)) {
    const [, saltHex, hashHex] = stored.split('$');
    if (!saltHex || !hashHex) return { ok: false, legacy: false };
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(plain, Buffer.from(saltHex, 'hex'), expected.length);
    return {
      ok: actual.length === expected.length && crypto.timingSafeEqual(actual, expected),
      legacy: false,
    };
  }
  // Old plain text password. Compare safely, caller will upgrade it.
  const a = crypto.createHash('sha256').update(plain).digest();
  const b = crypto.createHash('sha256').update(stored).digest();
  return { ok: crypto.timingSafeEqual(a, b), legacy: true };
}

// ---------------------------------------------------------------------------
// Admin PINs. They live in the ADMIN_PINS environment variable, comma separated.
// If it is not set, no PIN works. Admin role users are not affected.
// ---------------------------------------------------------------------------
export function isValidAdminPin(pin: unknown): boolean {
  const input = String(pin ?? '').trim();
  if (!input) return false;
  const allowed = (process.env.ADMIN_PINS || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const h = (s: string) => crypto.createHash('sha256').update(s).digest();
  let ok = false;
  for (const p of allowed) {
    if (crypto.timingSafeEqual(h(input), h(p))) ok = true;
  }
  return ok;
}

// ---------------------------------------------------------------------------
// Login attempt limiter (kept in memory, fine for one running copy).
// ---------------------------------------------------------------------------
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, { count: number; first: number }>();

function prune(now: number) {
  if (failures.size < 500) return;
  for (const [k, v] of failures) {
    if (now - v.first > WINDOW_MS) failures.delete(k);
  }
}

export function loginBlocked(key: string): boolean {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry) return false;
  if (now - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  prune(now);
  const entry = failures.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: now });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}
