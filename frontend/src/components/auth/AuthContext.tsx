"use client";

import { createContext } from "react";
import type { AuthUser, AuthStatus } from "@/types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
