"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { watchAuthState } from "@/lib/auth";
import { db } from "@/lib/firebase";
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
    let stopProfileListener: (() => void) | undefined;
    let missingProfileTimer: ReturnType<typeof setTimeout> | undefined;

    const unsub = watchAuthState((user) => {
      stopProfileListener?.();
      if (missingProfileTimer) clearTimeout(missingProfileTimer);

      if (!user) {
        setState({ firebaseUser: null, appUser: null, loading: false });
        return;
      }

      setState({ firebaseUser: user, appUser: null, loading: true });
      stopProfileListener = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            if (missingProfileTimer) clearTimeout(missingProfileTimer);
            setState({ firebaseUser: user, appUser: snapshot.data() as AppUser, loading: false });
            return;
          }

          // A sign-up creates the Auth account just before its profile doc.
          // Give that write a brief chance to arrive before route guards act.
          missingProfileTimer = setTimeout(() => {
            setState({ firebaseUser: user, appUser: null, loading: false });
          }, 1500);
        },
        () => setState({ firebaseUser: user, appUser: null, loading: false })
      );
    });
    return () => {
      unsub();
      stopProfileListener?.();
      if (missingProfileTimer) clearTimeout(missingProfileTimer);
    };
  }, []);

  return state;
}
