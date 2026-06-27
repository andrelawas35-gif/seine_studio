import { useEffect, useState } from "react";

const rawAuthUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();
// VITE_NEON_AUTH_URL is a same-origin path (e.g. "/neon-auth") served by the auth proxy
// in functions/neon-auth. Resolve it to an absolute URL against the current origin so the
// session cookie stays first-party (required for iOS Safari / installed PWAs).
const authUrl =
  rawAuthUrl?.startsWith("/") && typeof window !== "undefined"
    ? `${window.location.origin}${rawAuthUrl}`
    : rawAuthUrl;
const authEnabled = import.meta.env.VITE_DATA_MODE === "api" && Boolean(authUrl);

export const isAuthConfigured = authEnabled;

// Exchanges the first-party session cookie for a short-lived EdDSA JWT that the API
// routes verify against Neon Auth's JWKS. `/token` returns `{ token }` directly.
export async function getAuthToken(): Promise<string | null> {
  if (!authUrl) return null;
  try {
    const res = await fetch(`${authUrl}/token`, { credentials: "include" });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { token?: string } | null;
    return body?.token ?? null;
  } catch {
    return null;
  }
}

export type SessionUser = { id: string; email: string; name?: string | null };
type SessionState = { data: { user: SessionUser } | null; isPending: boolean; error: unknown };

// Listeners notified after sign-in / sign-out so mounted useSession() hooks re-fetch.
const sessionListeners = new Set<() => void>();
function notifySessionChanged() {
  sessionListeners.forEach((listener) => listener());
}

async function fetchSession(): Promise<{ user: SessionUser } | null> {
  if (!authUrl) return null;
  try {
    const res = await fetch(`${authUrl}/get-session`, { credentials: "include" });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { user?: SessionUser } | null;
    return body?.user ? { user: body.user } : null;
  } catch {
    return null;
  }
}

// Reads the Neon Auth (Better Auth) session via its REST `/get-session` endpoint.
// We don't use better-auth's React adapter because Neon's hosted service mounts the
// API under /neondb/auth rather than the adapter's expected /api/auth base path.
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    data: null,
    isPending: authEnabled,
    error: null,
  });

  useEffect(() => {
    if (!authEnabled) {
      setState({ data: null, isPending: false, error: null });
      return;
    }
    let active = true;
    const load = () => {
      setState((prev) => ({ ...prev, isPending: true }));
      void fetchSession().then((data) => {
        if (active) setState({ data, isPending: false, error: null });
      });
    };
    load();
    sessionListeners.add(load);
    return () => {
      active = false;
      sessionListeners.delete(load);
    };
  }, []);

  return state;
}

export async function signInWithEmail(email: string, password: string) {
  if (!authUrl) throw new Error("Authentication is not configured.");
  const res = await fetch(`${authUrl}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: { message: (body as Record<string, string>).message || `Sign in failed (${res.status})` } };
  }
  notifySessionChanged();
  return {};
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  if (!authUrl) throw new Error("Authentication is not configured.");
  const res = await fetch(`${authUrl}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, name }),
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: { message: (body as Record<string, string>).message || `Sign up failed (${res.status})` } };
  }
  notifySessionChanged();
  return {};
}

export async function forgotPassword(email: string) {
  if (!authUrl) throw new Error("Authentication is not configured.");
  const res = await fetch(`${authUrl}/forget-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return res.ok ? {} : { error: { message: "Password reset is not available." } };
}

export async function signOut() {
  if (!authUrl) return;
  await fetch(`${authUrl}/sign-out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  }).catch(() => {});
  notifySessionChanged();
}

export async function verifyEmailCode(code: string) {
  if (!authUrl) throw new Error("Authentication is not configured.");
  const res = await fetch(`${authUrl}/email-otp/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: { message: (body as Record<string, string>).message || `Verification failed (${res.status})` } };
  }
  return {};
}
