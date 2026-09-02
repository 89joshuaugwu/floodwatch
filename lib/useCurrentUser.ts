"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { watchAuthState, getAppUser } from "@/lib/auth";
import type { AppUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

/**
 * Client hook exposing the current Firebase auth user plus the matching
 * Firestore /users profile (role, subscriptions). `loading` stays true
 * until the initial auth check resolves, so route guards don't flash a
 * "logged out" state before Firebase has reported back.
 */
export function useCurrentUser(): AuthState {
  const [state, setState] = useState<AuthState>({ firebaseUser: null, appUser: null, loading: true });

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) {
        setState({ firebaseUser: null, appUser: null, loading: false });
        return;
      }
      const appUser = await getAppUser(user.uid);
      setState({ firebaseUser: user, appUser, loading: false });
    });
    return unsub;
  }, []);

  return state;
}
