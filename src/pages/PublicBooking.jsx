import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Solo los estados donde Lisbeth está licenciada — no ofrecer citas donde no
// puede operar legalmente.
const STATE_TIMEZONES = {
  Arizona: "America/Phoenix",
  California: "America/Los_Angeles",
  Florida: "America/New_York",
  "New Mexico": "America/Denver",
  Ohio: "America/New_York",
  Texas: "America/Chicago",
  Virginia: "America/New_York",
  Wisconsin: "America/Chicago",
};

const STATES = Object.keys(STATE_TIMEZONES).sort();

const COVERAGE_OPTIONS = [
  "Protección de Gastos Finales",
  "Protección de Vida a Término",
  "Protección de Vida Entera",
  "Protección de Vida para Niños",
  "Protección por Muerte Accidental",
  "Protección Hipotecaria",
  "Protección contra el Cáncer",
  "Protección de UCI",
  "Protección de Enfermedad Crítica",
  "Protección de Hospitalización",
  "Protección por Accidentes",
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

const SUPABASE_URL = "https://glxmakgcvzympuioqvlp.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/public-booking`;
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseG1ha2djdnp5bXB1aW9xdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDI5NDUsImV4cCI6MjEwMjcxODk0NX0.WDAfmLq-ySTbAMH8rWfyHCtGdQRgOJzwfLU6jenbWks";

// Solo se puede agendar en los próximos 2 días, de 9 a. m. a 5 p. m.
const MIN_DAYS_AHEAD = 1;
const MAX_DAYS_AHEAD = 2;
const OPEN_TIME = "09:00";
const CLOSE_TIME = "17:00";

const isoDate = (d) => d.toISOString().slice(0, 10);

export const PublicBooking = () => {
  const [searchParams] = useSearchParams();
  const coverageFromUrl =
    searchParams.get("coverage") || "Protección de Gastos Finales";
  const [form, setForm] = useState({ ...emptyForm, coverage: coverageFromUrl });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_DAYS_AHEAD);
    return isoDate(d);
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DAYS_AHEAD);
    return isoDate(d);
  }, []);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/get_occupied_slots`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    })
      .then((res) => res.json())
      .then((data) => setOccupiedSlots(Array.isArray(data) ? data : []))
      .catch(() => setOccupiedSlots([]));
  }, []);

  const timezone = STATE_TIMEZONES[form.state] || "America/Chicago";

  const occupiedTimesForDate = useMemo(() => {
    if (!form.date) return [];
    return occupiedSlots
      .filter((slot) => {
        const d = new Date(slot.starts_at);
        const localDate = d.toLocaleDateString("en-CA", { timeZone: timezone });
        return localDate === form.date;
      })
      .map((slot) =>
        new Date(slot.starts_at).toLocaleTimeString("es", {
          timeZone: timezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
  }, [occupiedSlots, form.date, timezone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.date || !form.time) {
      setError("Nombre, teléfono, fecha y hora son obligatorios.");
      return;
    }

    if (form.date < minDate || form.date > maxDate) {
      setError("Solo puedes agendar dentro de los próximos 2 días.");
      return;
    }

    if (form.time < OPEN_TIME || form.time > CLOSE_TIME) {
      setError("El horario de consultas es de 9:00 a. m. a 5:00 p. m.");
      return;
    }

    setSaving(true);

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
            Tu consulta gratuita quedó agendada. Nuestro equipo se pondrá en
            contacto contigo para confirmar los detalles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-booking-screen">
      <div className="public-booking-intro">
        <h1>Protege a tu familia de los gastos finales</h1>
        <p>
          Que tu familia no tenga que preocuparse por gastos funerarios en un
          momento difícil. Agenda tu consulta gratuita con uno de nuestros
          asesores y selecciona el día y horario que mejor te convenga.
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
                min={minDate}
                max={maxDate}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label>
              Hora *
              <input
                type="time"
                value={form.time}
                min={OPEN_TIME}
                max={CLOSE_TIME}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </label>
          </div>
          <p className="public-booking-hint">
            Consultas de 9:00 a. m. a 5:00 p. m., dentro de los próximos 2
            días.
          </p>

          {form.date && occupiedTimesForDate.length > 0 && (
            <p className="public-booking-hint public-booking-occupied">
              Horarios ya ocupados ese día: {occupiedTimesForDate.join(", ")}
            </p>
          )}

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
