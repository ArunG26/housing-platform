import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Secure Portal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in with your authorized account to access the portal.</p>
      <LoginForm />
    </section>
  );
}
