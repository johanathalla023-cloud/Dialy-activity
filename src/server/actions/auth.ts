"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { redirectWith } from "./util";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirectWith("/login", { error: "Email dan kata sandi wajib diisi." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && user.active && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    redirectWith("/login", { error: "Email atau kata sandi salah." });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  setSessionCookie(token);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}
