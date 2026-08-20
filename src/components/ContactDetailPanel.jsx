import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppointmentDetail } from "./AppointmentDetail";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatAppointmentDay,
  formatAppointmentClock,
} from "../lib/appointmentStatus";

export const ContactDetailPanel = ({ contact, onClose }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, contact:contacts(id, name, phone, email)")
      .eq("contact_id", contact.id)
      .order("starts_at", { ascending: false });
    setAppointments(data ?? []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`contact-appointments-${contact.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `contact_id=eq.${contact.id}` },
        load,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const now = new Date();
  const next = appointments
    .filter((a) => new Date(a.starts_at) >= now && a.status !== "cancelled")
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  const history = appointments.filter((a) => a.id !== next?.id);

  return (
    <div className="contact-detail-panel">
      <div className="contact-detail-header">
        <div>
          <div className="contact-detail-name">{contact.name || contact.phone || "Sin nombre"}</div>
          <div className="inbox-thread-phone">{contact.phone}</div>
        </div>
        <button type="button" className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <button
        type="button"
        className="calendar-new-btn"
        style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
        onClick={() => navigate(`/inbox?contact=${contact.id}`)}
      >
        <MessageCircle size={16} /> Abrir conversación
      </button>

      <div className="contact-detail-section-title">Próxima cita</div>
      {next ? (
        <button type="button" className="appointment-row appointment-row-card" onClick={() => setSelected(next)}>
          <span className="appointment-row-time">
            {formatAppointmentDay(next.starts_at, next.timezone)} {formatAppointmentClock(next.starts_at, next.timezone)}
          </span>
          <span className="appointment-row-name">{next.appointment_type || "Consulta"}</span>
          <span className="status-badge small" style={{ backgroundColor: STATUS_COLORS[next.status] }}>
            {STATUS_LABELS[next.status]}
          </span>
        </button>
      ) : (
        <div className="pipeline-empty">Sin cita programada</div>
      )}

      <div className="contact-detail-section-title">Historial de citas</div>
      {history.length === 0 && <div className="pipeline-empty">Sin citas anteriores</div>}
      {history.map((appt) => (
        <button key={appt.id} type="button" className="appointment-row" onClick={() => setSelected(appt)}>
          <span className="appointment-row-time">{formatAppointmentDay(appt.starts_at, appt.timezone)}</span>
          <span className="appointment-row-name">{appt.appointment_type || "Consulta"}</span>
          <span className="status-badge small" style={{ backgroundColor: STATUS_COLORS[appt.status] }}>
            {STATUS_LABELS[appt.status]}
          </span>
        </button>
      ))}

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
