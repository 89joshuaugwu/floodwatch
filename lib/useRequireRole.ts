"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { UserRole } from "@/types";

/**
 * Redirects unauthenticated users to /auth/login and wrong-role users to
 * their own home, per DESIGN.md's RBAC table (Section "6. RBAC" in
 * CONTEXT.md). Returns the same state as useCurrentUser so pages can also
 * render a loading state while the check resolves.
 */
export function useRequireRole(requiredRole: UserRole) {
  const { firebaseUser, appUser, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || !appUser) {
      router.replace("/auth/login");
      return;
    }
    if (appUser.role !== requiredRole) {
      router.replace(appUser.role === "admin" ? "/admin/stations" : "/dashboard");
    }
  }, [loading, firebaseUser, appUser, requiredRole, router]);

  return { firebaseUser, appUser, loading };
}
