import type { Env } from "../_shared/env";

// Same-origin proxy for Neon Auth (Better Auth) REST endpoints.
//
// Why this exists: Neon Auth is hosted on a *different* registrable domain than the app
// (…neonauth.…neon.tech vs. seine-studio.pages.dev). Its session cookie is therefore a
// cross-site cookie, which iOS Safari / installed PWAs refuse to persist — so sign-in
// "loops back" to the login screen. By proxying the auth API under the app's own origin
// (`/neon-auth/*`), the Set-Cookie binds to the app domain and becomes first-party.
//
// The client points VITE_NEON_AUTH_URL at `${appOrigin}/neon-auth`. The server keeps the
// real Neon Auth URL in NEON_AUTH_URL for JWKS verification (see _shared/auth.ts).

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NEON_AUTH_URL) {
    return new Response(JSON.stringify({ error: "Auth is not configured." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const upstreamBase = env.NEON_AUTH_URL.replace(/\/$/, "");
  const segments = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  const incoming = new URL(request.url);
  const target = `${upstreamBase}/${path}${incoming.search}`;

  // Forward request headers, dropping hop-by-hop ones. Force a trusted Origin so Better
  // Auth's CSRF check passes (the app's own origin is in Neon Auth trusted origins).
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("origin", incoming.origin);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  // Copy response headers, preserving every Set-Cookie line. The upstream cookie has no
  // Domain attribute, so passing it through binds it to the app origin (first-party).
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie" || HOP_BY_HOP.has(lower)) return;
    responseHeaders.set(key, value);
  });
  const setCookies =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};
