import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isAdmin: false,
});

export function useAuthContext() {
  return useContext(AuthContext);
}
