import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
];

const emptyForm = {
  contactId: "",
  name: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  timezone: "America/Chicago",
  appointmentType: "Consulta de protección familiar",
  notes: "",
};

export const AppointmentModal = ({ onClose, onSaved, defaultContact }) => {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("contacts")
      .select("id, name, phone, email")
      .order("name")
      .then(({ data }) => setContacts(data ?? []));
  }, []);

  useEffect(() => {
    if (defaultContact) {
      setForm((f) => ({
        ...f,
        contactId: defaultContact.id,
        name: defaultContact.name || "",
        phone: defaultContact.phone || "",
        email: defaultContact.email || "",
      }));
    }
  }, [defaultContact]);

  const handleContactPick = (contactId) => {
    const c = contacts.find((c) => c.id === contactId);
    setForm((f) => ({
      ...f,
      contactId,
      name: c?.name || f.name,
      phone: c?.phone || f.phone,
      email: c?.email || f.email,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.date || !form.time || (!form.contactId && !form.phone)) {
      setError("Fecha, hora y contacto (o teléfono) son obligatorios.");
      return;
    }

    setSaving(true);

    let contactId = form.contactId;

    if (!contactId) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({ name: form.name, phone: form.phone, email: form.email, source: "manual" })
        .select()
        .single();
      if (contactError) {
        setError(contactError.message);
        setSaving(false);
        return;
      }
      contactId = newContact.id;
    }

    // Build an ISO string that represents the wall-clock time in the chosen
    // timezone, then let Postgres/JS resolve it to the correct UTC instant.
    const startsAtLocal = new Date(`${form.date}T${form.time}:00`);
    const offsetMinutes = startsAtLocal.getTimezoneOffset();
    const startsAtIso = new Date(startsAtLocal.getTime() - offsetMinutes * 60000).toISOString();

    const { error: apptError } = await supabase.from("appointments").insert({
      contact_id: contactId,
      starts_at: startsAtIso,
      timezone: form.timezone,
      appointment_type: form.appointmentType,
      notes: form.notes,
      source: "manual",
      created_by: "crm",
    });

    if (apptError) {
      setError(apptError.message);
      setSaving(false);
      return;
    }

    const { data: stage } = await supabase
      .from("stages")
      .select("id")
      .eq("name", "Cita Agendada")
      .single();

    if (stage) {
      await supabase.from("deals").update({ stage_id: stage.id }).eq("contact_id", contactId);
    }

    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva cita</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Contacto existente
            <select value={form.contactId} onChange={(e) => handleContactPick(e.target.value)}>
              <option value="">— Nuevo contacto —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.phone}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-form-row">
            <label>
              Nombre
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!!form.contactId}
              />
            </label>
            <label>
              Teléfono
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={!!form.contactId}
              />
            </label>
          </div>

          <label>
            Correo
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!!form.contactId}
            />
          </label>

          <div className="modal-form-row">
            <label>
              Fecha
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </label>
          </div>

          <label>
            Zona horaria
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de consulta
            <input
              value={form.appointmentType}
              onChange={(e) => setForm({ ...form, appointmentType: e.target.value })}
            />
          </label>

          <label>
            Notas
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cita"}
          </button>
        </form>
      </div>
    </div>
  );
};
