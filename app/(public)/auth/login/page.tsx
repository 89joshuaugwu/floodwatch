"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/PublicShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { login, getUserRole } from "@/lib/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      // Route by role: admins land in the admin console, residents in
      // their dashboard, per DESIGN.md's routing map.
      const uid = auth.currentUser?.uid;
      const role = uid ? await getUserRole(uid) : null;
      router.push(role === "admin" ? "/admin/stations" : "/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="max-w-sm mx-auto py-10">
        <h1 className="font-display text-2xl font-semibold text-center mb-6">Log in</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="text-sm text-text-secondary text-center mt-4">
          Resident? <Link href="/auth/signup" className="text-primary font-medium">Sign up</Link>
        </p>
        <p className="text-xs text-text-secondary text-center mt-2">
          Admin accounts are provisioned manually — contact your disaster-management authority.
        </p>
      </div>
    </PublicShell>
  );
}
