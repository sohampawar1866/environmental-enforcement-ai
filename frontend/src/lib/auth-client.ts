import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
});

export const { signIn, signUp, signOut, useSession } = authClient;

export interface OfficerProfile {
  id: string;
  name: string;
  email: string;
  role: "adjudicator" | "warden";
  badge_id?: string;
  rank?: string;
  jurisdiction?: string;
}
