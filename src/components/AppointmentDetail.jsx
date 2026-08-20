import { useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatAppointmentDay,
  formatAppointmentClock,
} from "../lib/appointmentStatus";

export const AppointmentDetail = ({ appointment, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  if (!appointment) return null;
  const contact = appointment.contact;

  const logActivity = async (body) => {
    await supabase.from("activities").insert({
      contact_id: appointment.contact_id,
      type: "appointment_status",
      body,
    });
  };

  const setStatus = async (status, label) => {
    await supabase.from("appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", appointment.id);

    if (status === "completed") {
      const { data: stage } = await supabase.from("stages").select("id").eq("name", "Cita Realizada").single();
      if (stage) await supabase.from("deals").update({ stage_id: stage.id }).eq("contact_id", appointment.contact_id);
    }

    if (status === "no_show") {
      const followUp = new Date();
      followUp.setMonth(followUp.getMonth() + 3);
      const { data: stage } = await supabase.from("stages").select("id").eq("name", "No Cerrado (retargeting)").single();
      if (stage) {
        await supabase
          .from("deals")
          .update({ stage_id: stage.id, next_follow_up_at: followUp.toISOString() })
          .eq("contact_id", appointment.contact_id);
      }
    }

    await logActivity(`Cita marcada como "${label}"`);
    onChanged?.();
  };

  const cancelAppointment = async () => {
    await setStatus("cancelled", STATUS_LABELS.cancelled);
  };

  const openConversation = () => {
    navigate(`/inbox?contact=${appointment.contact_id}`);
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;

    const oldWhen = `${formatAppointmentDay(appointment.starts_at, appointment.timezone)} ${formatAppointmentClock(appointment.starts_at, appointment.timezone)}`;

    const local = new Date(`${newDate}T${newTime}:00`);
    const startsAtIso = new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString();

    await supabase
      .from("appointments")
      .update({ starts_at: startsAtIso, status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", appointment.id);

    await logActivity(`Cita reprogramada: de ${oldWhen} a ${newDate} ${newTime}`);
    setRescheduling(false);
    onChanged?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle de cita</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="appointment-detail-body">
          <span
            className="status-badge"
            style={{ backgroundColor: STATUS_COLORS[appointment.status] }}
          >
            {STATUS_LABELS[appointment.status] || appointment.status}
          </span>

          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Contacto</span>
            <span>{contact?.name || contact?.phone || "Sin nombre"}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Teléfono</span>
            <span>{contact?.phone || "—"}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Correo</span>
            <span>{contact?.email || "—"}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Fecha</span>
            <span>{formatAppointmentDay(appointment.starts_at, appointment.timezone)}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Hora</span>
            <span>{formatAppointmentClock(appointment.starts_at, appointment.timezone)}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Tipo</span>
            <span>{appointment.appointment_type || "—"}</span>
          </div>
          {appointment.coverage_interest && (
            <div className="appointment-detail-row">
              <span className="appointment-detail-label">Interés</span>
              <span>{appointment.coverage_interest}</span>
            </div>
          )}
          {appointment.notes && (
            <div className="appointment-detail-row">
              <span className="appointment-detail-label">Notas</span>
              <span>{appointment.notes}</span>
            </div>
          )}
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Origen</span>
            <span>{appointment.source || "—"}</span>
          </div>
          <div className="appointment-detail-row">
            <span className="appointment-detail-label">Creada</span>
            <span>{formatAppointmentDay(appointment.created_at, appointment.timezone)}</span>
          </div>

          <div className="appointment-actions">
            <button type="button" onClick={() => setStatus("confirmed", STATUS_LABELS.confirmed)}>
              Confirmar
            </button>
            <button type="button" onClick={() => setRescheduling((r) => !r)}>
              Reprogramar
            </button>
            <button type="button" onClick={() => setStatus("completed", STATUS_LABELS.completed)}>
              Marcar realizada
            </button>
            <button type="button" onClick={() => setStatus("no_show", STATUS_LABELS.no_show)}>
              Marcar No Show
            </button>
            <button type="button" className="appointment-action-danger" onClick={cancelAppointment}>
              Cancelar
            </button>
            <button type="button" onClick={openConversation}>
              Abrir conversación
            </button>
          </div>

          {rescheduling && (
            <form className="modal-form-row reschedule-form" onSubmit={submitReschedule}>
              <label>
                Nueva fecha
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </label>
              <label>
                Nueva hora
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
              </label>
              <button type="submit">Guardar</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
