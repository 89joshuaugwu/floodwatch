"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth";
import type { UserRole } from "@/types";

interface Props {
  children: ReactNode;
  role: UserRole;
}

const RESIDENT_LINKS = [{ href: "/dashboard", label: "Dashboard" }];

const ADMIN_LINKS = [
  { href: "/admin/stations", label: "Stations" },
  { href: "/admin/alerts", label: "Alerts" },
];

export function AppShell({ children, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "admin" ? ADMIN_LINKS : RESIDENT_LINKS;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-h-12">
            <Image src="/logo.png" alt="FloodWatch" width={32} height={32} priority />
            <span className="font-display font-semibold text-lg text-text-primary">FloodWatch</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
            <Link href="/stations" className="px-3 py-2 rounded-lg hover:bg-slate-100 min-h-12 flex items-center">
              Stations
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg min-h-12 flex items-center ${
                  pathname.startsWith(link.href) ? "bg-blue-50 text-primary" : "hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 min-h-12 flex items-center text-text-secondary"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
