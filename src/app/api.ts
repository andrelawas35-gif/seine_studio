export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[]> };
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

import { getAuthToken } from "./auth";

// Auth-enabled flag (mirrors auth.ts to avoid circular import)
const isAuthConfigured = import.meta.env.VITE_DATA_MODE === "api" && Boolean(import.meta.env.VITE_NEON_AUTH_URL?.trim());

let lastTokenRefreshPromise: Promise<string | null> | null = null;

async function refreshAndGetToken(): Promise<string | null> {
  if (!lastTokenRefreshPromise) {
    lastTokenRefreshPromise = getAuthToken().finally(() => {
      lastTokenRefreshPromise = null;
    });
  }
  return lastTokenRefreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const token = await getAuthToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  // Callers may pass either "/expenses" or "/api/expenses"; normalize so we never
  // emit a doubled "/api/api/..." path (which 404s to HTML and breaks JSON parsing).
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;

  let response = await fetch(`/api${normalizedPath}`, { ...init, headers });

  // Token-refresh-and-retry: if we get a 401 and have auth configured, attempt
  // a single token refresh then retry once. Prevents spurious sign-outs on
  // expired-token responses while still catching real auth failures.
  if (response.status === 401 && isAuthConfigured) {
    const freshToken = await refreshAndGetToken();
    if (freshToken) {
      headers.set("authorization", `Bearer ${freshToken}`);
      response = await fetch(`/api${normalizedPath}`, { ...init, headers });
    }
  }

  // A non-JSON response (e.g. an HTML 404 or SPA fallback) means we hit the wrong
  // path or the function failed before it could respond. Surface a clear error
  // instead of letting JSON.parse throw "The string did not match the expected pattern."
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    throw new ApiError(
      response.status,
      "non_json_response",
      response.ok
        ? "The server returned an unexpected response. Please refresh and try again."
        : `Request failed (${response.status}). ${text.slice(0, 120)}`.trim(),
    );
  }

  const body = (await response.json()) as T | ApiErrorBody;

  if (!response.ok) {
    const failure = body as ApiErrorBody;
    throw new ApiError(response.status, failure.error.code, failure.error.message, failure.error.fields);
  }

  return body as T;
}
