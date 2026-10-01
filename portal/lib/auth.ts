import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requiredEnv } from "@/lib/config";

import type { Role, Session } from "@/lib/contracts";

export const SESSION_COOKIE_NAME = "housing_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sessionSecret(): string {
  return requiredEnv("SESSION_SECRET");
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", sessionSecret())
    .update(left)
    .digest();

  const rightDigest = createHmac("sha256", sessionSecret())
    .update(right)
    .digest();

  return timingSafeEqual(leftDigest, rightDigest);
}

function encodeSession(session: Session): string {
  const payload = Buffer.from(
    JSON.stringify(session),
    "utf8"
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined
): Session | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");

  if (!payload || !signature) return null;

  const expected = sign(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Session;

    if (
      !session.username ||
      !session.role ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    if (
      session.role !== "VIEWER" &&
      session.role !== "ANALYST"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function createSessionToken(
  username: string,
  role: Role
): string {
  return encodeSession({
    username,
    role,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

export function sessionCookieOptions() {
  const production =
    (process.env.ENVIRONMENT ?? "local").toLowerCase() === "prod";

  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();

  return verifySessionToken(
    store.get(SESSION_COOKIE_NAME)?.value
  );
}

export async function requireSession(
  roles?: Role[]
): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (roles && !roles.includes(session.role)) {
    redirect("/");
  }

  return session;
}

export function hasRole(
  session: Session,
  roles: Role[]
): boolean {
  return roles.includes(session.role);
}

export function verifyCredentials(
  username: string,
  password: string
): { username: string; role: Role } | null {
  const users = [
    {
      username: requiredEnv("DEMO_VIEWER_USERNAME"),
      password: requiredEnv("DEMO_VIEWER_PASSWORD"),
      role: "VIEWER" as const,
    },
    {
      username: requiredEnv("DEMO_ANALYST_USERNAME"),
      password: requiredEnv("DEMO_ANALYST_PASSWORD"),
      role: "ANALYST" as const,
    },
  ];

  const candidate = users.find((user) =>
    constantTimeEqual(user.username, username)
  );

  if (
    !candidate ||
    !constantTimeEqual(candidate.password, password)
  ) {
    return null;
  }

  return {
    username: candidate.username,
    role: candidate.role,
  };
}