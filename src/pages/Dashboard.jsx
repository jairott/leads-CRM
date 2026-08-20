import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export const Dashboard = () => {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const [{ data: stageRows }, { data: dealRows }, { data: messageRows }] = await Promise.all([
      supabase.from("stages").select("*").order("position"),
      supabase.from("deals").select("*, contact:contacts(id, name, phone)"),
      supabase
        .from("messages")
        .select("*, contact:contacts(id, name, phone)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    setStages(stageRows ?? []);
    setDeals(dealRows ?? []);
    setMessages(messageRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    const channel = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadDashboard)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadDashboard]);

  if (loading) return <div className="page-loading">Cargando...</div>;

  const now = new Date();
  const retargetingDeals = deals
    .filter((d) => d.next_follow_up_at)
    .sort((a, b) => new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at));

  return (
    <div className="dashboard">
      <div className="dashboard-stats">
        {stages.map((stage) => (
          <div key={stage.id} className="stat-card" style={{ borderTopColor: stage.color }}>
            <div className="stat-count">{deals.filter((d) => d.stage_id === stage.id).length}</div>
            <div className="stat-label">{stage.name}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <span>Mensajes recientes</span>
            <Link to="/inbox" className="dashboard-panel-link">Ver bandeja</Link>
          </div>
          {messages.length === 0 && <div className="pipeline-empty">Sin mensajes todavía</div>}
          {messages.map((m) => (
            <div key={m.id} className="dashboard-row">
              <div className="dashboard-row-main">
                <span className="dashboard-row-name">
                  {m.contact?.name || m.contact?.phone || "Sin nombre"}
                </span>
                <span className={`dashboard-row-direction ${m.direction}`}>
                  {m.direction === "in" ? "recibido" : "enviado"}
                </span>
              </div>
              <div className="dashboard-row-preview">{m.body}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <span>Retargeting pendiente</span>
            <Link to="/" className="dashboard-panel-link">Ver pipeline</Link>
          </div>
          {retargetingDeals.length === 0 && <div className="pipeline-empty">Nada pendiente</div>}
          {retargetingDeals.map((d) => {
            const due = new Date(d.next_follow_up_at);
            const overdue = due <= now;
            return (
              <div key={d.id} className="dashboard-row">
                <div className="dashboard-row-main">
                  <span className="dashboard-row-name">
                    {d.contact?.name || d.contact?.phone || "Sin nombre"}
                  </span>
                  <span className={`dashboard-row-due ${overdue ? "overdue" : ""}`}>
                    {overdue ? "Vencido " : ""}
                    {due.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="dashboard-row-preview">{d.contact?.phone}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
