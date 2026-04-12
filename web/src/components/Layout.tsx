import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "../hooks/useAuth";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: "/options",
    label: "Clans",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Paramètres",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M19.07 4.93L19.07 4.93M4.93 4.93A10 10 0 0 0 19.07 19.07" />
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const discordUsername =
    user?.user_metadata?.["full_name"] ??
    user?.user_metadata?.["name"] ??
    user?.email ??
    "Utilisateur";

  const avatarUrl = user?.user_metadata?.["avatar_url"] as string | undefined;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Blobs */}
      <div
        className="bg-blob"
        style={{
          width: 600,
          height: 600,
          background: "#7c3aed",
          top: -100,
          left: -200,
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: 400,
          height: 400,
          background: "#6366f1",
          bottom: -100,
          right: -100,
        }}
      />

      {/* Sidebar */}
      <aside
        className="relative z-10 flex flex-col w-64 shrink-0"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <img src="/logo.png" alt="Solve" className="w-9 h-9 rounded-lg" />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Solve</p>
            <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
              Clans Panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "hover:text-white"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.3))",
                      color: "white",
                      border: "1px solid rgba(124,58,237,0.3)",
                    }
                  : { color: "rgba(241,245,249,0.5)", border: "1px solid transparent" }
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
              >
                {discordUsername.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{discordUsername}</p>
              <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
                Administrateur
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Déconnexion"
              className="shrink-0 p-1 rounded-lg transition-colors hover:text-red-400"
              style={{ color: "rgba(241,245,249,0.4)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
