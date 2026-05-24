"use client";

import { createContext, useContext } from "react";
import type { Session, AuthError } from "@supabase/supabase-js";

export interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuthContext = createContext<AuthContextValue>(null as any);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
