import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const STATE_TIMEZONES = {
  Alabama: "America/Chicago",
  Alaska: "America/Anchorage",
  Arizona: "America/Phoenix",
  Arkansas: "America/Chicago",
  California: "America/Los_Angeles",
  Colorado: "America/Denver",
  Connecticut: "America/New_York",
  Delaware: "America/New_York",
  Florida: "America/New_York",
  Georgia: "America/New_York",
  Hawaii: "Pacific/Honolulu",
  Idaho: "America/Denver",
  Illinois: "America/Chicago",
  Indiana: "America/New_York",
  Iowa: "America/Chicago",
  Kansas: "America/Chicago",
  Kentucky: "America/New_York",
  Louisiana: "America/Chicago",
  Maine: "America/New_York",
  Maryland: "America/New_York",
  Massachusetts: "America/New_York",
  Michigan: "America/New_York",
  Minnesota: "America/Chicago",
  Mississippi: "America/Chicago",
  Missouri: "America/Chicago",
  Montana: "America/Denver",
  Nebraska: "America/Chicago",
  Nevada: "America/Los_Angeles",
  "New Hampshire": "America/New_York",
  "New Jersey": "America/New_York",
  "New Mexico": "America/Denver",
  "New York": "America/New_York",
  "North Carolina": "America/New_York",
  "North Dakota": "America/Chicago",
  Ohio: "America/New_York",
  Oklahoma: "America/Chicago",
  Oregon: "America/Los_Angeles",
  Pennsylvania: "America/New_York",
  "Rhode Island": "America/New_York",
  "South Carolina": "America/New_York",
  "South Dakota": "America/Chicago",
  Tennessee: "America/Chicago",
  Texas: "America/Chicago",
  Utah: "America/Denver",
  Vermont: "America/New_York",
  Virginia: "America/New_York",
  Washington: "America/Los_Angeles",
  "West Virginia": "America/New_York",
  Wisconsin: "America/Chicago",
  Wyoming: "America/Denver",
  "District of Columbia": "America/New_York",
};

const STATES = Object.keys(STATE_TIMEZONES).sort();

const COVERAGE_OPTIONS = [
  "Seguro de Vida a Término",
  "Seguro de Vida Entera",
  "Seguro de Vida para Niños",
  "Seguro de Gastos Finales",
  "Seguro por Muerte Accidental",
  "Seguro de Protección Hipotecaria",
  "Seguro contra el Cáncer",
  "Seguro de UCI",
  "Seguro de Enfermedad Crítica",
  "Seguro de Hospitalización",
  "Seguro por Accidentes",
  "No sé / necesito orientación",
];

const BENEFITS = [
  "Consulta inicial gratuita.",
  "Atención personalizada según tu situación.",
  "Opciones explicadas de forma clara.",
  "Sin obligación de compra.",
  "Agenda directamente desde esta página.",
];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  state: "Texas",
  coverage: "",
  date: "",
  time: "",
};

const FUNCTION_URL =
  "https://glxmakgcvzympuioqvlp.supabase.co/functions/v1/public-booking";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseG1ha2djdnp5bXB1aW9xdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDI5NDUsImV4cCI6MjEwMjcxODk0NX0.WDAfmLq-ySTbAMH8rWfyHCtGdQRgOJzwfLU6jenbWks";

export const PublicBooking = () => {
  const [searchParams] = useSearchParams();
  const coverageFromUrl = searchParams.get("coverage") || "";
  const [form, setForm] = useState({ ...emptyForm, coverage: coverageFromUrl });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.date || !form.time) {
      setError("Nombre, teléfono, fecha y hora son obligatorios.");
      return;
    }

    setSaving(true);

    const timezone = STATE_TIMEZONES[form.state] || "America/Chicago";
    const local = new Date(`${form.date}T${form.time}:00`);
    const startsAtIso = new Date(
      local.getTime() - local.getTimezoneOffset() * 60000,
    ).toISOString();

    const digitsOnly = form.phone.replace(/[^0-9]/g, "");
    const phoneE164 = form.phone.trim().startsWith("+")
      ? `+${digitsOnly}`
      : `+1${digitsOnly}`;

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneE164,
          starts_at: startsAtIso,
          name: form.name,
          email: form.email || null,
          timezone,
          state: form.state,
          coverage: form.coverage || null,
          source: "landing_own",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "No pudimos agendar tu consulta. Intenta de nuevo.");
        setSaving(false);
        return;
      }

      setSuccess(data);
    } catch (err) {
      setError("No pudimos conectar con el servidor. Intenta de nuevo.");
    }

    setSaving(false);
  };

  if (success) {
    return (
      <div className="public-booking-screen">
        <div className="public-booking-success-card">
          <h1>¡Listo, {form.name}!</h1>
          <p className="public-booking-subtitle">
            Tu consulta gratuita de protección familiar quedó agendada. Nuestro
            equipo se pondrá en contacto contigo para confirmar los detalles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-booking-screen">
      <div className="public-booking-intro">
        <h1>Protege lo que más te importa</h1>
        <p>
          Cuéntanos qué te preocupa proteger y agenda tu consulta gratuita con
          uno de nuestros asesores. Selecciona el día y horario que mejor te
          convenga.
        </p>
      </div>

      <div className="public-booking-columns">
        <div className="public-booking-card public-booking-info">
          <h2>¿Qué estás buscando proteger?</h2>
          <p className="public-booking-subtitle">
            Esta información nos ayuda a preparar una conversación más útil
            para ti.
          </p>

          <label>
            Cobertura de interés
            <select
              value={form.coverage}
              onChange={(e) => setForm({ ...form, coverage: e.target.value })}
            >
              <option value="">Selecciona una opción</option>
              {COVERAGE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <ul className="public-booking-benefits">
            {BENEFITS.map((b) => (
              <li key={b}>
                <span className="public-booking-check">✓</span> {b}
              </li>
            ))}
          </ul>

          <Link to="/calculadora" className="public-booking-calc-link">
            ¿No sabes cuánto podría costarte? Calcula tu estimado →
          </Link>
        </div>

        <form
          className="public-booking-card public-booking-form"
          onSubmit={handleSubmit}
        >
          <h2>Agenda tu consulta</h2>
          <p className="public-booking-subtitle">
            Completa tus datos y selecciona un horario disponible.
          </p>

          <label>
            Nombre completo *
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <div className="public-booking-row">
            <label>
              Teléfono *
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 555-5555"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@email.com"
              />
            </label>
          </div>

          <label>
            Estado *
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className="public-booking-row">
            <label>
              Fecha *
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label>
              Hora *
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </label>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={saving}>
            {saving ? "Agendando..." : "Agendar consulta gratis"}
          </button>

          <p className="public-booking-disclaimer">
            Al solicitar una consulta aceptas que nuestro equipo pueda
            comunicarse contigo por teléfono, SMS, WhatsApp o email en
            relación con tu solicitud.
          </p>
        </form>
      </div>
    </div>
  );
};
