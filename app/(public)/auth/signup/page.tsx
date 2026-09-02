"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/PublicShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { signUpResident } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUpResident(email, password, phone || undefined);
      toast.success("Account created.");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Could not create account. Try a different email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="max-w-sm mx-auto py-10">
        <h1 className="font-display text-2xl font-semibold text-center mb-2">Resident sign up</h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          Subscribe to alerts for stations near you. Station status is public and doesn&apos;t require an account.
        </p>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Phone (optional)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating account…" : "Sign up"}
            </Button>
          </form>
        </Card>
        <p className="text-sm text-text-secondary text-center mt-4">
          Already have an account? <Link href="/auth/login" className="text-primary font-medium">Log in</Link>
        </p>
      </div>
    </PublicShell>
  );
}
