import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
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
            <Link href="/auth/login" className="px-3 py-2 rounded-lg hover:bg-slate-100 min-h-12 flex items-center">
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark min-h-12 flex items-center"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>

      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-text-secondary flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FloodWatch — station status is public safety information, no login required.</span>
          <span>&copy; {new Date().getFullYear()} FloodWatch</span>
        </div>
      </footer>
    </div>
  );
}
