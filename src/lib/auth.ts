import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

const COOKIE_NAME = "pkl_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secretKey() {
  return new TextEncoder().encode(env.authSecret);
}

export type SessionData = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

export async function createSessionToken(user: SessionData): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export const getSession = cache(async (): Promise<SessionData | null> => {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
});

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId: string | null;
  supervisorId: string | null;
  schoolId: string | null;
  divisionId: string | null;
  schoolName: string | null;
  divisionName: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      studentProfile: { include: { school: true } },
      supervisorProfile: { include: { division: true } },
    },
  });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studentId: user.studentProfile?.id ?? null,
    supervisorId: user.supervisorProfile?.id ?? null,
    schoolId: user.studentProfile?.schoolId ?? null,
    divisionId: user.supervisorProfile?.divisionId ?? null,
    schoolName: user.studentProfile?.school.name ?? null,
    divisionName: user.supervisorProfile?.division.name ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?error=Akses+ditolak");
  return user;
}
