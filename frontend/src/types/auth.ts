export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
