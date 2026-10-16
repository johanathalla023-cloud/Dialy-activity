import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/server/actions/auth";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
          TH
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Daily Activity PKL</h1>
        <p className="mt-1 text-sm text-slate-500">Trans Hybrid — Log harian, persetujuan, dan laporan resmi.</p>
      </div>

      <div className="card">
        <Alert error={searchParams.error} />
        <form action={loginAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="input"
              placeholder="nama@transhybrid.test"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>
          <SubmitButton pendingText="Memproses…">Masuk</SubmitButton>
        </form>
      </div>
    </div>
  );
}
