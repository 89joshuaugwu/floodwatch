"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/types";

export async function signUpResident(email: string, password: string, phone?: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const appUser: AppUser = {
    uid: cred.user.uid,
    email,
    phone: phone ?? "",
    role: "resident",
    subscribedStationIds: [],
  };
  await setDoc(doc(db, "users", cred.user.uid), appUser);
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const appUser = await getAppUser(uid);
  return appUser?.role ?? null;
}

export async function subscribeToStation(uid: string, stationId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    subscribedStationIds: arrayUnion(stationId),
  });
}

export async function unsubscribeFromStation(uid: string, stationId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    subscribedStationIds: arrayRemove(stationId),
  });
}
