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

// --- Horario de atención de Liz -------------------------------------------
// Liz atiende en hora de FLORIDA. Los clientes están en 8 estados repartidos
// en 3 husos horarios, así que las franjas se definen SIEMPRE en la hora de
// Liz y se le muestran al cliente traducidas a su propia hora.
const LIZ_TZ = "America/New_York";
const LIZ_TZ_LABEL = "hora de Florida";

// Mañana 8:40 a 1:00 p. m. y tarde 4:00 a 9:00 p. m. (hora de Liz).
// La última cita empieza 30 min antes del cierre.
const LIZ_SLOTS = (() => {
  const slots = ["08:40"];
  for (let h = 9; h < 13; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 12) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("12:30");
  for (let h = 16; h < 21; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("20:30");
  return [...new Set(slots)].sort();
})();

// Diferencia entre una hora UTC y la misma hora leída en `tz`.
const zoneOffsetMs = (utcMs, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(utcMs))
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMs;
};

// "2026-08-27" + "08:40" en la zona de Liz -> milisegundos UTC reales.
const utcMsFromLizTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let ts = naive;
  for (let i = 0; i < 3; i += 1) ts = naive - zoneOffsetMs(ts, LIZ_TZ);
  return ts;
};

const formatInZone = (utcMs, tz) =>
  new Date(utcMs).toLocaleTimeString("es-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

const SUPABASE_URL = "https://glxmakgcvzympuioqvlp.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/public-booking`;
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseG1ha2djdnp5bXB1aW9xdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDI5NDUsImV4cCI6MjEwMjcxODk0NX0.WDAfmLq-ySTbAMH8rWfyHCtGdQRgOJzwfLU6jenbWks";

// Solo se agenda a partir del día siguiente; para hoy existe "que me llamen".
const MIN_DAYS_AHEAD = 1;
const MAX_DAYS_AHEAD = 7;

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

  // Instantes exactos (ms UTC) que ya están ocupados.
  const occupiedMs = useMemo(
    () =>
      new Set(
        occupiedSlots
          .map((slot) => new Date(slot.starts_at).getTime())
          .filter((ms) => !Number.isNaN(ms)),
      ),
    [occupiedSlots],
  );

  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
  };

  // Franjas del día elegido, ya traducidas a la hora del cliente.
  const slotsForDate = useMemo(() => {
    if (!form.date || isSunday(form.date)) return [];
    const now = Date.now();
    return LIZ_SLOTS.map((lizTime) => {
      const ms = utcMsFromLizTime(form.date, lizTime);
      return {
        lizTime,
        ms,
        localLabel: formatInZone(ms, timezone),
        lizLabel: formatInZone(ms, LIZ_TZ),
        taken: occupiedMs.has(ms),
        past: ms <= now,
        // Hora del cliente: no ofrecemos madrugadas ni horas de dormir aunque
        // caigan dentro del horario de Liz (hay 3 husos de diferencia).
        localHour: Number(
          new Date(ms).toLocaleString("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            hour12: false,
          }).slice(0, 2),
        ) % 24,
      };
    }).filter(
      (slot) => !slot.past && slot.localHour >= 7 && slot.localHour < 21,
    );
  }, [form.date, timezone, occupiedMs]);

  const availableSlots = slotsForDate.filter((slot) => !slot.taken);

  // El cliente y Liz están en husos distintos: solo avisamos si difieren.
  const showsBothZones = timezone !== LIZ_TZ;

  // Primera franja libre dentro de la ventana permitida, para "que me llamen".
  const findNextAvailableSlot = () => {
    const now = Date.now();
    for (let offset = MIN_DAYS_AHEAD; offset <= MAX_DAYS_AHEAD; offset += 1) {
      const day = new Date();
      day.setDate(day.getDate() + offset);
      const dateStr = isoDate(day);
      if (isSunday(dateStr)) continue;
      for (const lizTime of LIZ_SLOTS) {
        const ms = utcMsFromLizTime(dateStr, lizTime);
        if (ms > now && !occupiedMs.has(ms)) {
          return { date: dateStr, time: lizTime, ms };
        }
      }
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
          "No encontramos un horario libre esta semana. Intenta elegir día y hora manualmente.",
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

    const cleanName = submitForm.name.trim();
    const letterCount = (cleanName.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g) || []).length;
    if (cleanName.length < 3 || letterCount < 3) {
      setError("Escribe tu nombre completo para que Liz sepa con quién habla.");
      return;
    }

    const phoneDigits = submitForm.phone.replace(/[^0-9]/g, "");
    const localDigits =
      phoneDigits.length === 11 && phoneDigits.startsWith("1")
        ? phoneDigits.slice(1)
        : phoneDigits;
    if (localDigits.length !== 10) {
      setError("Escribe tu teléfono a 10 dígitos, con la clave de área.");
      return;
    }
    if (/^(\d)\1{9}$/.test(localDigits) || localDigits === "1234567890") {
      setError("Ese número no parece válido. Revísalo, por favor.");
      return;
    }
    if (["0", "1"].includes(localDigits[0])) {
      setError("La clave de área no puede empezar con 0 ni con 1.");
      return;
    }

    if (!submitForm.date || !submitForm.time) {
      setError("Nombre, teléfono, fecha y hora son obligatorios.");
      return;
    }

    if (submitForm.date < minDate || submitForm.date > maxDate) {
      setError("Solo puedes agendar desde mañana y hasta dentro de una semana.");
      return;
    }

    if (isSunday(submitForm.date)) {
      setError("Los domingos no atendemos. Elige otro día, por favor.");
      return;
    }

    if (!LIZ_SLOTS.includes(submitForm.time)) {
      setError("Elige una de las horas disponibles en la lista.");
      return;
    }

    const startsAtMs = utcMsFromLizTime(submitForm.date, submitForm.time);
    if (startsAtMs <= Date.now()) {
      setError("Ese horario ya pasó. Elige otro, por favor.");
      return;
    }

    setSaving(true);

    const startsAtIso = new Date(startsAtMs).toISOString();

    const phoneE164 = `+1${localDigits}`;

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
          name: cleanName,
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
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value, time: "" })
                    }
                    required
                  />
                </label>
                <label>
                  Hora *
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    disabled={!form.date || availableSlots.length === 0}
                    required
                  >
                    <option value="">
                      {form.date ? "Elige una hora" : "Elige primero el día"}
                    </option>
                    {availableSlots.map((slot) => (
                      <option key={slot.lizTime} value={slot.lizTime}>
                        {slot.localLabel}
                        {showsBothZones ? ` (${slot.lizLabel} en Florida)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.date && isSunday(form.date) && (
                <p className="public-booking-hint public-booking-occupied">
                  Los domingos no atendemos. Elige otro día, por favor.
                </p>
              )}

              {form.date &&
                !isSunday(form.date) &&
                availableSlots.length === 0 && (
                  <p className="public-booking-hint public-booking-occupied">
                    Ese día ya está lleno. Prueba con otro, o pide que te
                    llamen lo antes posible.
                  </p>
                )}

              <p className="public-booking-hint">
                Las horas se muestran en tu hora local
                {showsBothZones ? `, con la ${LIZ_TZ_LABEL} entre paréntesis` : ""}.
                Puedes agendar desde mañana y hasta dentro de una semana.
              </p>
            </>
          ) : (
            <p className="public-booking-hint">
              Te llamamos lo antes posible, en el primer espacio libre de la
              agenda de Liz — no necesitas elegir una hora exacta.
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
