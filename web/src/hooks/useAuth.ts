import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";

// Réexporte le context pour compatibilité
export function useAuth() {
  return useAuthContext();
}

export function signInWithDiscord(): Promise<void> {
  return supabase.auth
    .signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/callback`,
        scopes: "identify",
      },
    })
    .then(() => undefined);
}

export function signOut(): Promise<void> {
  return supabase.auth.signOut().then(() => undefined);
}
