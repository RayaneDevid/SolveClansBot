import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Ticket } from "../lib/types";

interface Stats {
  open: number;
  closed: number;
  total: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ open: 0, closed: 0, total: 0 });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [openResult, closedResult, recentResult] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "closed"),
        supabase.from("tickets").select("*").order("opened_at", { ascending: false }).limit(10),
      ]);

      setStats({
        open: openResult.count ?? 0,
        closed: closedResult.count ?? 0,
        total: (openResult.count ?? 0) + (closedResult.count ?? 0),
      });
      setRecentTickets((recentResult.data ?? []) as Ticket[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(241,245,249,0.5)" }}>
          Vue d'ensemble des tickets
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Tickets ouverts"
          value={stats.open}
          icon="🟢"
          gradient="rgba(34,197,94,0.15)"
          border="rgba(34,197,94,0.2)"
        />
        <StatCard
          label="Tickets fermés"
          value={stats.closed}
          icon="🔒"
          gradient="rgba(124,58,237,0.15)"
          border="rgba(124,58,237,0.2)"
        />
        <StatCard
          label="Total"
          value={stats.total}
          icon="🎫"
          gradient="rgba(99,102,241,0.15)"
          border="rgba(99,102,241,0.2)"
        />
      </div>

      {/* Recent tickets */}
      <div className="glass p-6">
        <h2 className="text-base font-semibold text-white mb-4">Tickets récents</h2>
        {recentTickets.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(241,245,249,0.4)" }}>
            Aucun ticket pour l'instant.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: ticket.status === "open" ? "#22c55e" : "rgba(241,245,249,0.3)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {ticket.rp_first_name} {ticket.rp_last_name}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(241,245,249,0.4)" }}>
                    <code className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>
                      #{ticket.channel_id}
                    </code>{" "}
                    · {new Date(ticket.opened_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background:
                      ticket.status === "open"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(241,245,249,0.07)",
                    color:
                      ticket.status === "open"
                        ? "#86efac"
                        : "rgba(241,245,249,0.4)",
                  }}
                >
                  {ticket.status === "open" ? "Ouvert" : "Fermé"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  border,
}: {
  label: string;
  value: number;
  icon: string;
  gradient: string;
  border: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: gradient, border: `1px solid ${border}` }}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
