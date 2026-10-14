import { getCurrentUser } from "@/lib/auth";
import type { Actor } from "@/server/services";

export async function currentActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    userId: user.id,
    name: user.name,
    role: user.role,
    studentId: user.studentId,
    supervisorId: user.supervisorId,
  };
}
