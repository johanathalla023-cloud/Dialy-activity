import { redirect } from "next/navigation";

export function redirectWith(path: string, params: Record<string, string | undefined>): never {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, value);
  }
  const qs = q.toString();
  redirect(qs ? `${path}?${qs}` : path);
}

export function backWithError(path: string, message: string): never {
  return redirectWith(path, { error: message });
}
