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

// La calculadora manda el código de dos letras; aquí trabajamos con el nombre.
const STATE_CODE_TO_NAME = {
  AZ: "Arizona",
  CA: "California",
  FL: "Florida",
  NM: "New Mexico",
  OH: "Ohio",
  TX: "Texas",
  VA: "Virginia",
  WI: "Wisconsin",
};

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
  state: "",
  coverage: "",
  date: "",
  time: "",
};

// Franjas de 30 min, 9am-5pm, para elegir automáticamente la más próxima
// disponible cuando alguien prefiere que lo llamemos en vez de escoger hora.
const BUSINESS_SLOTS = (() => {
  const slots = [];
  for (let h = 9; h < 17; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

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
  // La calculadora ya preguntó el estado: lo pre-llenamos para no repetirlo.
  const stateFromUrl =
    STATE_CODE_TO_NAME[(searchParams.get("state") || "").toUpperCase()] || "";
  const [form, setForm] = useState({
    ...emptyForm,
    coverage: coverageFromUrl,
    state: stateFromUrl,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  // "schedule": el usuario elige día y hora exacta. "callback": pedimos que
  // le llamemos lo antes posible (menos fricción que agendar un horario fijo).
  const [bookingMode, setBookingMode] = useState(
    searchParams.get("modo") === "callback" ? "callback" : "schedule",
  );

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
  const isFinalExpense = form.coverage === "Protección de Gastos Finales";

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

  // Busca la franja de 30 min más próxima que no aparezca ya ocupada, dentro
  // de la ventana permitida (próximos 2 días, 9am-5pm, sin fines de semana).
  const findNextAvailableSlot = () => {
    let cursor = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + MAX_DAYS_AHEAD);

    while (cursor <= limit) {
      const dateStr = isoDate(cursor);
      if (dateStr >= minDate && dateStr <= maxDate) {
        const weekday = cursor.toLocaleDateString("en-US", { weekday: "short" });
        if (!["Sat", "Sun"].includes(weekday)) {
          const occupiedToday = occupiedSlots
            .filter((slot) => {
              const d = new Date(slot.starts_at);
              return (
                d.toLocaleDateString("en-CA", { timeZone: timezone }) ===
                dateStr
              );
            })
            .map((slot) =>
              new Date(slot.starts_at).toLocaleTimeString("en-GB", {
                timeZone: timezone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }),
            );
          const freeSlot = BUSINESS_SLOTS.find(
            (t) => !occupiedToday.includes(t),
          );
          if (freeSlot) return { date: dateStr, time: freeSlot };
        }
      }
      cursor = new Date(cursor.getTime() + 86400000);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let submitForm = form;
    if (bookingMode === "callback") {
      const next = findNextAvailableSlot();
      if (!next) {
        setError(
          "No encontramos un horario libre en los próximos 2 días. Intenta elegir día y hora manualmente.",
        );
        return;
      }
      submitForm = { ...form, date: next.date, time: next.time };
      setForm(submitForm);
    }

    if (!submitForm.name || !submitForm.phone || !submitForm.state) {
      setError("Nombre, teléfono y estado son obligatorios.");
      return;
    }

    if (!submitForm.date || !submitForm.time) {
      setError("Nombre, teléfono, fecha y hora son obligatorios.");
      return;
    }

    if (submitForm.date < minDate || submitForm.date > maxDate) {
      setError("Solo puedes agendar dentro de los próximos 2 días.");
      return;
    }

    if (submitForm.time < OPEN_TIME || submitForm.time > CLOSE_TIME) {
      setError("El horario de consultas es de 9:00 a. m. a 5:00 p. m.");
      return;
    }

    setSaving(true);

    const local = new Date(`${submitForm.date}T${submitForm.time}:00`);
    const startsAtIso = new Date(
      local.getTime() - local.getTimezoneOffset() * 60000,
    ).toISOString();

    const digitsOnly = submitForm.phone.replace(/[^0-9]/g, "");
    const phoneE164 = submitForm.phone.trim().startsWith("+")
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
          name: submitForm.name,
          email: submitForm.email || null,
          timezone,
          state: submitForm.state,
          coverage: submitForm.coverage || null,
          source: bookingMode === "callback" ? "landing_own_callback" : "landing_own",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "No pudimos agendar tu consulta. Intenta de nuevo.");
        setSaving(false);
        return;
      }

      setSuccess(data);
      // Meta Pixel: evento Lead real (cita agendada exitosamente).
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "Lead");
      }
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
        <h1>{isFinalExpense ? "Protege a tu familia de los gastos finales" : "Protege a tu familia y su hogar"}</h1>
        <p>
          {isFinalExpense
            ? "Que tu familia no tenga que preocuparse por gastos funerarios en un momento difícil."
            : "Que quienes dependen de ti puedan mantener su hogar y su tranquilidad si mañana faltara tu ingreso."}{" "}
          Agenda tu consulta gratuita con uno de nuestros asesores y selecciona
          el día y horario que mejor te convenga.
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
              required
            >
              <option value="" disabled>
                Selecciona tu estado
              </option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className="public-booking-mode-toggle">
            <button
              type="button"
              className={bookingMode === "schedule" ? "is-active" : ""}
              onClick={() => setBookingMode("schedule")}
            >
              Elegir día y hora
            </button>
            <button
              type="button"
              className={bookingMode === "callback" ? "is-active" : ""}
              onClick={() => setBookingMode("callback")}
            >
              Prefiero que me llamen lo antes posible
            </button>
          </div>

          {bookingMode === "schedule" ? (
            <>
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
            </>
          ) : (
            <p className="public-booking-hint">
              Te llamaremos en cuanto tengamos un espacio libre, dentro de
              los próximos 2 días en horario de 9:00 a. m. a 5:00 p. m. — no
              necesitas elegir una hora exacta.
            </p>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={saving}>
            {saving
              ? "Agendando..."
              : bookingMode === "callback"
                ? "Que me llamen gratis"
                : "Agendar consulta gratis"}
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
