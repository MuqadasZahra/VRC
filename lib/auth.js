// lib/auth.js
// A minimal password-based session, replacing Firebase Authentication.
// The admin password lives only in the ADMIN_PASSWORD environment variable
// (never in the page code). On correct login we hand back a signed,
// HttpOnly cookie; every admin API route checks it before touching data.

import crypto from 'crypto';

const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds
const COOKIE_NAME = 'victoria_admin_session';

function sign(payload) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
}

export function createSessionCookie() {
  const expiry = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `admin.${expiry}`;
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAuthed(req) {
  const cookieHeader = req.headers.cookie || '';
  const found = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE_NAME + '='));
  if (!found) return false;

  const value = found.split('=').slice(1).join('=');
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [prefix, expiryStr, sig] = parts;
  const payload = `${prefix}.${expiryStr}`;
  if (sig !== sign(payload)) return false;
  if (Date.now() > Number(expiryStr)) return false;
  return true;
}
