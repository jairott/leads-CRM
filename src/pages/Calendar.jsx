import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppointmentModal } from "../components/AppointmentModal";
import { AppointmentDetail } from "../components/AppointmentDetail";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatAppointmentDay,
  formatAppointmentClock,
} from "../lib/appointmentStatus";

const RANGES = {
  hoy: 1,
  semana: 7,
  mes: 31,
};

export const Calendar = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("semana");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, contact:contacts(id, name, phone, email)")
      .order("starts_at", { ascending: true });
    setAppointments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("appointments-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  if (loading) return <div className="page-loading">Cargando calendario...</div>;

  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + RANGES[range]);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const visible = appointments.filter((a) => {
    const d = new Date(a.starts_at);
    return d >= startOfToday && d <= rangeEnd;
  });

  const upcoming = appointments
    .filter((a) => new Date(a.starts_at) >= now && a.status !== "cancelled")
    .slice(0, 6);

  const grouped = visible.reduce((acc, appt) => {
    const key = formatAppointmentDay(appt.starts_at, appt.timezone);
    acc[key] = acc[key] || [];
    acc[key].push(appt);
    return acc;
  }, {});

  return (
    <div className="dashboard">
      <div className="calendar-toolbar">
        <div className="calendar-tabs">
          {["hoy", "semana", "mes"].map((r) => (
            <button
              key={r}
              className={`calendar-tab ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r === "hoy" ? "Hoy" : r === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <button type="button" className="calendar-new-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nueva cita
        </button>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-panel calendar-agenda">
          <div className="dashboard-panel-header">
            <span>Agenda</span>
          </div>
          {Object.keys(grouped).length === 0 && (
            <div className="pipeline-empty">Sin citas en este rango</div>
          )}
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="calendar-day-group">
              <div className="calendar-day-label">{day}</div>
              {items.map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  className="appointment-row"
                  onClick={() => setSelected(appt)}
                >
                  <span className="appointment-row-time">
                    {formatAppointmentClock(appt.starts_at, appt.timezone)}
                  </span>
                  <span className="appointment-row-name">
                    {appt.contact?.name || appt.contact?.phone || "Sin nombre"}
                  </span>
                  <span
                    className="status-badge small"
                    style={{ backgroundColor: STATUS_COLORS[appt.status] }}
                  >
                    {STATUS_LABELS[appt.status]}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <span>Próximas citas</span>
          </div>
          {upcoming.length === 0 && <div className="pipeline-empty">Nada agendado</div>}
          {upcoming.map((appt) => (
            <div key={appt.id} className="dashboard-row" onClick={() => setSelected(appt)} style={{ cursor: "pointer" }}>
              <div className="dashboard-row-main">
                <span className="dashboard-row-name">
                  {appt.contact?.name || appt.contact?.phone || "Sin nombre"}
                </span>
                <span
                  className="status-badge small"
                  style={{ backgroundColor: STATUS_COLORS[appt.status] }}
                >
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>
              <div className="dashboard-row-preview">
                {formatAppointmentDay(appt.starts_at, appt.timezone)} — {formatAppointmentClock(appt.starts_at, appt.timezone)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}

      {selected && (
        <AppointmentDetail
          appointment={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};
