import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const Pipeline = () => {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragDealId, setDragDealId] = useState(null);

  const loadBoard = useCallback(async () => {
    const [{ data: stageRows }, { data: dealRows }] = await Promise.all([
      supabase.from("stages").select("*").order("position"),
      supabase
        .from("deals")
        .select("*, contact:contacts(id, name, phone, source)")
        .order("created_at", { ascending: false }),
    ]);
    setStages(stageRows ?? []);
    setDeals(dealRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBoard();

    const channel = supabase
      .channel("deals-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, loadBoard)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadBoard)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadBoard]);

  const moveDeal = async (dealId, stageId) => {
    const targetStage = stages.find((s) => s.id === stageId);
    const isRetargeting = targetStage?.name === "No Cerrado (retargeting)";

    const update = { stage_id: stageId };
    if (isRetargeting) {
      const followUp = new Date();
      followUp.setMonth(followUp.getMonth() + 3);
      update.next_follow_up_at = followUp.toISOString();
    }

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, ...update } : d)),
    );
    await supabase.from("deals").update(update).eq("id", dealId);
  };

  if (loading) return <div className="page-loading">Cargando pipeline...</div>;

  return (
    <div className="pipeline-board">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage_id === stage.id);
        return (
          <div
            key={stage.id}
            className="pipeline-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragDealId && moveDeal(dragDealId, stage.id)}
          >
            <div className="pipeline-column-header" style={{ borderColor: stage.color }}>
              <span>{stage.name}</span>
              <span className="pipeline-count">{stageDeals.length}</span>
            </div>
            <div className="pipeline-column-body">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="deal-card"
                  draggable
                  onDragStart={() => setDragDealId(deal.id)}
                  onDragEnd={() => setDragDealId(null)}
                >
                  <div className="deal-title">{deal.title}</div>
                  <div className="deal-contact">{deal.contact?.name || deal.contact?.phone || "Sin nombre"}</div>
                  {deal.source && <div className="deal-source">{deal.source}</div>}
                  {deal.value != null && <div className="deal-value">${deal.value}</div>}
                  {deal.next_follow_up_at && (
                    <div className="deal-followup">
                      🔁 Reintentar: {new Date(deal.next_follow_up_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              ))}
              {stageDeals.length === 0 && (
                <div className="pipeline-empty">Sin leads</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
