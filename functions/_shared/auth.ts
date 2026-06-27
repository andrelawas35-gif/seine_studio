import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { appUsers } from "../../src/server/db/schema";
import type { Database } from "./db";
import type { ServerEnv } from "./env";
import { HttpError } from "./http";

type AppRole = "owner" | "developer";

export interface AuthenticatedUser {
  id: string;
  authUserId: string;
  email: string;
  displayName: string;
  role: AppRole;
}

export function resolveAllowedRole(
  email: string,
  env: Pick<ServerEnv, "OWNER_EMAIL" | "DEVELOPER_EMAIL">,
): AppRole | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === env.OWNER_EMAIL) return "owner";
  if (normalized === env.DEVELOPER_EMAIL) return "developer";
  return null;
}

const jwksByAuthUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(authUrl: string) {
  const normalized = authUrl.replace(/\/$/, "");
  const existing = jwksByAuthUrl.get(normalized);
  if (existing) return existing;

  const jwks = createRemoteJWKSet(new URL(`${normalized}/.well-known/jwks.json`));
  jwksByAuthUrl.set(normalized, jwks);
  return jwks;
}

async function verifyNeonToken(request: Request, authUrl: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Sign in to continue.", "unauthenticated");
  }

  const normalizedAuthUrl = authUrl.replace(/\/$/, "");
  // JWKS is served from the /neondb/auth subpath, but Neon Auth issues tokens whose
  // `iss`/`aud` are the host origin (no subpath). Validate against the origin.
  const issuerAudience = new URL(normalizedAuthUrl).origin;
  try {
    return await jwtVerify(authorization.slice(7), getJwks(normalizedAuthUrl), {
      issuer: issuerAudience,
      audience: issuerAudience,
    });
  } catch {
    throw new HttpError(401, "Your session is invalid or has expired.", "invalid_session");
  }
}

export async function requireUser(request: Request, env: ServerEnv, db: Database): Promise<AuthenticatedUser> {
  const { payload } = await verifyNeonToken(request, env.NEON_AUTH_URL);
  const authUserId = typeof payload.sub === "string" ? payload.sub : undefined;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : undefined;

  if (!authUserId || !email) {
    throw new HttpError(401, "Your session is missing required identity claims.", "invalid_session");
  }

  const role = resolveAllowedRole(email, env);
  if (!role) {
    // Temporarily log the email for debugging — remove in production
    throw new HttpError(403, `This account (${email}) is not authorized. Allowed: ${env.OWNER_EMAIL}, ${env.DEVELOPER_EMAIL}`, "forbidden");
  }

  const displayName =
    (typeof payload.name === "string" && payload.name.trim()) || (role === "owner" ? "Owner" : "Developer");
  const [existing] = await db.select().from(appUsers).where(eq(appUsers.authUserId, authUserId)).limit(1);

  if (existing) {
    if (!existing.active) throw new HttpError(403, "This account has been disabled.", "account_disabled");

    const [updated] = await db
      .update(appUsers)
      .set({ email, displayName, role, lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(appUsers.id, existing.id))
      .returning();
    return updated as AuthenticatedUser;
  }

  const [created] = await db
    .insert(appUsers)
    .values({ authUserId, email, displayName, role, lastSeenAt: new Date() })
    .returning();
  return created as AuthenticatedUser;
}
