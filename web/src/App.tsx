import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { AuthContext } from "./contexts/AuthContext";
import type { AuthContextValue } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
import Options from "./pages/Options";
import Settings from "./pages/Settings";

async function checkAdmin(discordId: string): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("id")
    .eq("discord_id", discordId)
    .maybeSingle();
  return !!data;
}

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
      <div className="text-center">
        <p className="text-4xl mb-4">🚫</p>
        <h1 className="text-xl font-bold text-white mb-2">Accès refusé</h1>
        <p className="text-sm" style={{ color: "rgba(241,245,249,0.5)" }}>
          Ton compte Discord n'est pas autorisé à accéder au panel. Contacte l'administrateur du panel pour plus d'informations.
        </p>
        <a href="/login" className="btn-primary inline-block mt-6 text-sm">
          Retour
        </a>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "#7c3aed" }} />
        <p className="text-sm" style={{ color: "rgba(241,245,249,0.4)" }}>Chargement...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthContextValue>({
    user: null,
    session: null,
    isAdmin: false,
  });

  useEffect(() => {
    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const discordId =
            session.user.user_metadata?.provider_id ??
            session.user.identities?.[0]?.id;
          const isAdmin = discordId ? await checkAdmin(discordId) : false;
          setAuth({ user: session.user, session, isAdmin });
        }
      } catch {
        // Pas de session valide
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  if (loading) return <Spinner />;

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="options" element={<Options />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
