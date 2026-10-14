import type { Prisma, PrismaClient } from "@prisma/client";

export type Db = PrismaClient | Prisma.TransactionClient;

export type Actor = {
  userId: string;
  name: string;
  role: "SISWA" | "PEMBIMBING" | "HRD" | "ADMIN";
  studentId?: string | null;
  supervisorId?: string | null;
};

export type AuditInput = {
  actor: Actor;
  action: string;
  entityType: string;
  entityId: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
};
