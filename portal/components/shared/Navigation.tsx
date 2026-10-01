"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Session } from "@/lib/contracts";

const links = [
  { href: "/", label: "Overview" },
  { href: "/estimator", label: "Value Estimator" },
  { href: "/market", label: "Market Analysis" },
];

export function Navigation({ session }: { session: Session | null }) {
  const pathname = usePathname();
  if (!session) {
    return <Link href="/login" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-slate-900">Sign in</Link>;
  }
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-slate-900 ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-900">Sign out</button>
        </form>
      </nav>
      <p className="text-xs text-slate-500">{session.username} · {session.role}</p>
    </div>
  );
}
