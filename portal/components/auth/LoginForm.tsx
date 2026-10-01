"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as {
          message?: string;
        };

        throw new Error(
          body.message ?? "Login failed"
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-4"
      aria-describedby={error ? "login-error" : undefined}
    >
      <label className="block text-sm font-medium text-slate-700">
        Username

        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password

        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
          required
        />
      </label>

      {error && (
        <p
          id="login-error"
          role="alert"
          className="text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting
          ? "Signing in…"
          : "Sign in"}
      </button>
    </form>
  );
}