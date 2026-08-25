import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Calculator.css";

// Calculadora v2 — 4 preguntas.
//
// Reglas de negocio acordadas con Jairo (2026-08-25):
//  - NUNCA se dice "seguro de vida". Se dice "protección familiar" o "póliza".
//  - No se promete aprobación ni precio exacto antes de revisar elegibilidad.
//    Por eso el resultado muestra un RANGO AMPLIO de cobertura, nunca una
//    prima exacta ni una cifra cerrada.
//  - El botón principal del resultado agenda una hora concreta (/agendar),
//    que es donde se guarda el lead en Supabase y se dispara el evento Lead.
//  - Solo operamos en 8 estados: la pregunta 2 es un filtro duro.

const Q1_OPTIONS = [
  {
    value: "mi",
    icon: "♦",
    label: "Para mí",
    segment: "familiar",
    coverage: "No sé / necesito orientación",
    resultText: "proteger a tu familia",
    weight: 2,
  },
  {
    value: "pareja",
    icon: "♥",
    label: "Para mí y mi pareja",
    segment: "familiar",
    coverage: "No sé / necesito orientación",
    resultText: "proteger a tu pareja y tu hogar",
    weight: 3,
  },
  {
    value: "hijos",
    icon: "⌂",
    label: "Para mis hijos o quienes dependen de mí",
    segment: "familiar",
    coverage: "Protección Hipotecaria",
    resultText: "proteger a tus hijos y su hogar",
    weight: 3,
  },
  {
    value: "padres",
    icon: "✦",
    label: "Para mis padres",
    segment: "hijo_adulto",
    coverage: "Protección de Gastos Finales",
    resultText: "proteger a tus padres de gastos inesperados",
    weight: 3,
  },
];

const Q2_OPTIONS = [
  { value: "AZ", icon: "AZ", label: "Arizona", weight: 1 },
  { value: "CA", icon: "CA", label: "California", weight: 1 },
  { value: "FL", icon: "FL", label: "Florida", weight: 1 },
  { value: "NM", icon: "NM", label: "Nuevo México", weight: 1 },
  { value: "OH", icon: "OH", label: "Ohio", weight: 1 },
  { value: "TX", icon: "TX", label: "Texas", weight: 1 },
  { value: "VA", icon: "VA", label: "Virginia", weight: 1 },
  { value: "WI", icon: "WI", label: "Wisconsin", weight: 1 },
  { value: "OTRO", icon: "—", label: "Otro estado", weight: -99 },
];

const Q3_OPTIONS = [
  { value: "18-34", icon: "1", label: "Entre 18 y 34 años", table: "t35", weight: 1 },
  { value: "35-44", icon: "2", label: "Entre 35 y 44 años", table: "t35", weight: 2 },
  { value: "45-54", icon: "3", label: "Entre 45 y 54 años", table: "t50", weight: 3 },
  { value: "55-64", icon: "4", label: "Entre 55 y 64 años", table: null, weight: 3 },
  { value: "65+", icon: "5", label: "65 años o más", table: null, weight: 2 },
];

const Q4_OPTIONS = [
  { value: 25, icon: "$", label: "Alrededor de $25 al mes", weight: 1 },
  { value: 50, icon: "$", label: "Alrededor de $50 al mes", weight: 2 },
  { value: 75, icon: "$", label: "Alrededor de $75 al mes", weight: 3 },
  { value: 100, icon: "$", label: "$100 al mes o más", weight: 3 },
  { value: null, icon: "?", label: "Todavía no lo sé", weight: 0 },
];

// Tabla de referencia del carrier (prima mensual aproximada -> cobertura),
// documentada para dos edades ancla: 35 y 50 años. NO se muestra tal cual:
// solo se usa para derivar un rango amplio de cobertura.
const OFFICIAL_TABLE_35 = [
  { monthly: 22.75, coverage: 10000 },
  { monthly: 42.15, coverage: 20000 },
  { monthly: 58.23, coverage: 30000 },
  { monthly: 67.6, coverage: 40000 },
  { monthly: 84.5, coverage: 50000 },
];

const OFFICIAL_TABLE_50 = [
  { monthly: 42.25, coverage: 10000 },
  { monthly: 84.1, coverage: 20000 },
  { monthly: 126.15, coverage: 30000 },
  { monthly: 146.47, coverage: 40000 },
  { monthly: 183.09, coverage: 50000 },
];

const TABLES = { t35: OFFICIAL_TABLE_35, t50: OFFICIAL_TABLE_50 };

const money = (n) => `$${n.toLocaleString("en-US")}`;

// Devuelve un RANGO amplio de cobertura (redondeado a $10,000) o null si no
// tenemos tabla documentada para esa edad o la persona no dio presupuesto.
const estimateRange = (ageOpt, monthly) => {
  const table = ageOpt?.table ? TABLES[ageOpt.table] : null;
  if (!table || !monthly) return null;

  if (monthly < table[0].monthly) return null;

  const last = table[table.length - 1];
  if (monthly >= last.monthly) {
    return { low: last.coverage, open: true };
  }

  for (let i = 0; i < table.length - 1; i += 1) {
    const a = table[i];
    const b = table[i + 1];
    if (monthly >= a.monthly && monthly <= b.monthly) {
      return { low: a.coverage, high: b.coverage };
    }
  }
  return null;
};

const STEPS_TOTAL = 4;

const scoreToBadge = (score) => {
  if (score >= 8) return "PRIORIDAD ALTA";
  if (score >= 5) return "PRIORIDAD MEDIA";
  return "BUENA BASE";
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = intro, 1-4 = preguntas, 5 = resultado
  const [answers, setAnswers] = useState({});

  const setAnswer = (q, opt) => {
    setAnswers((prev) => ({ ...prev, [q]: opt }));
    setTimeout(() => setStep((s) => s + 1), 150);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const whoChoice = answers.q1;
  const stateChoice = answers.q2;
  const ageChoice = answers.q3;
  const budget = answers.q4?.value || null;

  const outOfArea = stateChoice?.value === "OTRO";

  const score =
    (whoChoice?.weight || 0) +
    (ageChoice?.weight || 0) +
    (answers.q4?.weight || 0);
  const badge = scoreToBadge(score);

  const range = estimateRange(ageChoice, budget);

  // Meta Pixel: señal secundaria. No es un lead real todavía — solo indica que
  // la persona terminó las 4 preguntas.
  useEffect(() => {
    if (
      step === 5 &&
      !outOfArea &&
      typeof window !== "undefined" &&
      typeof window.fbq === "function"
    ) {
      window.fbq("trackCustom", "CalculatorCompleted");
    }
  }, [step, outOfArea]);

  // mode: "callback" (que le llamen ya) | "schedule" (elegir dia y hora).
  const goToBooking = (mode = "schedule") => {
    const coverage = whoChoice?.coverage || "No sé / necesito orientación";
    const st = stateChoice?.value && !outOfArea ? stateChoice.value : "";
    navigate(
      `/agendar?coverage=${encodeURIComponent(coverage)}&state=${encodeURIComponent(st)}&modo=${mode}`,
    );
  };

  const trackWhatsApp = () => {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("trackCustom", "WhatsAppClick");
    }
  };

  const whatsappHref =
    "https://wa.me/14329241307?text=" +
    encodeURIComponent(
      "Hola Liz, acabo de hacer la evaluación de Protección Familiar y me gustaría hablar contigo.",
    );

  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  const questionSteps = [
    {
      n: 1,
      eyebrow: "TU FAMILIA",
      label: "¿Para quién buscas protección?",
      hint: "Selecciona la opción que más se parece a tu situación.",
      options: Q1_OPTIONS,
      key: "q1",
    },
    {
      n: 2,
      eyebrow: "TU ESTADO",
      label: "¿En qué estado vives?",
      hint: "Las opciones disponibles cambian según el estado.",
      options: Q2_OPTIONS,
      key: "q2",
    },
    {
      n: 3,
      eyebrow: "TU EDAD",
      label: "¿Cuál es tu rango de edad?",
      hint: "La edad es el factor que más influye en tu protección.",
      options: Q3_OPTIONS,
      key: "q3",
    },
    {
      n: 4,
      eyebrow: "TU PRESUPUESTO",
      label: "¿Cuánto podrías destinar al mes para proteger a tu familia?",
      hint: "Nos ayuda a enfocar la orientación. No es un compromiso.",
      options: Q4_OPTIONS,
      key: "q4",
    },
  ];

  const current = questionSteps[step - 1];

  return (
    <div className="pf-eval">
      <div className="pf-topbar">
        <div className="pf-brand">
          <span className="pf-brand-badge">PF</span>
          <div>
            <div className="pf-brand-name">Protección Familiar</div>
            <div className="pf-brand-sub">Orientación para tu tranquilidad</div>
          </div>
        </div>
        <div className="pf-privacy">
          <span>✓</span> Evaluación privada y gratuita
        </div>
      </div>

      {step === 0 && (
        <div className="pf-intro">
          <div className="pf-eyebrow">EVALUACIÓN GRATUITA · 60 SEGUNDOS</div>
          <h1>
            Descubre en 60 segundos cuánta protección necesita tu familia
          </h1>
          <p>
            Responde cuatro preguntas sencillas. Sin costo, sin compromiso y en
            español.
          </p>
          <button
            type="button"
            className="pf-btn-primary"
            onClick={() => setStep(1)}
          >
            Comenzar mi evaluación <span>→</span>
          </button>
          <div className="pf-trust-row">
            <span>✓ Solo 4 preguntas</span>
            <span>✓ Resultado inmediato</span>
            <span>✓ Consulta gratuita</span>
          </div>
        </div>
      )}

      {current && (
        <div className="pf-question-wrap">
          <button type="button" className="pf-back" onClick={goBack}>
            ← Atrás
          </button>
          <div className="pf-step-count">
            Paso {current.n} de {STEPS_TOTAL}
          </div>
          <div className="pf-q-card">
            <div className="pf-q-eyebrow">{current.eyebrow}</div>
            <h2>{current.label}</h2>
            <p className="pf-q-hint">{current.hint}</p>
            <div className="pf-options">
              {current.options.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  className={`pf-option ${answers[current.key]?.value === opt.value ? "selected" : ""}`}
                  onClick={() => setAnswer(current.key, opt)}
                >
                  <span className="pf-option-icon">{opt.icon}</span>
                  <span className="pf-option-label">{opt.label}</span>
                  <span className="pf-option-arrow">→</span>
                </button>
              ))}
            </div>
            <div className="pf-lock-note">
              🔒 Tus respuestas son privadas y se utilizan únicamente para
              preparar tu orientación.
            </div>
          </div>
        </div>
      )}

      {step === 5 && outOfArea && (
        <div className="pf-result-wrap">
          <div className="pf-result-card">
            <h2>Gracias por tomarte el tiempo.</h2>
            <p>
              Por ahora ofrecemos orientación únicamente en Arizona, California,
              Florida, Nuevo México, Ohio, Texas, Virginia y Wisconsin. Si te
              mudas a alguno de estos estados, con gusto te ayudamos.
            </p>
            <button type="button" className="pf-restart" onClick={restart}>
              Volver a comenzar
            </button>
          </div>
        </div>
      )}

      {step === 5 && !outOfArea && (
        <div className="pf-result-wrap">
          <div className="pf-result-card">
            <div className="pf-result-badges">
              <span className="pf-badge-done">✓ Evaluación completada</span>
              <span className="pf-badge-priority">RESULTADO: {badge}</span>
            </div>

            <h2>
              Según tus respuestas, sí podrías tener opciones disponibles.
            </h2>

            {range && (
              <div className="pf-range-box">
                <div className="pf-range-label">
                  Con lo que indicaste, tu protección estaría en un rango
                  aproximado de
                </div>
                <div className="pf-range-amount">
                  {range.open
                    ? `${money(range.low)} o más`
                    : `${money(range.low)} a ${money(range.high)}`}
                </div>
                <div className="pf-range-note">
                  Rango de referencia, no es una cotización ni una aprobación.
                  El monto final depende de tu edad exacta, tu salud y tu
                  elegibilidad. Liz te lo confirma sin costo.
                </div>
              </div>
            )}

            <p>
              Una asesora puede ayudarte a{" "}
              <b>{whoChoice?.resultText || "proteger a tu familia"}</b> y
              explicarte las alternativas en palabras sencillas, de acuerdo con
              tus necesidades y tu presupuesto.
            </p>

            <div className="pf-how-grid">
              <div className="pf-how-item">
                <div className="pf-how-num">1</div>
                <div>
                  <div className="pf-how-title">Pides tu llamada</div>
                  <div className="pf-how-sub">
                    O eliges día y hora. Toma menos de un minuto.
                  </div>
                </div>
              </div>
              <div className="pf-how-item">
                <div className="pf-how-num">2</div>
                <div>
                  <div className="pf-how-title">Liz revisa tu caso</div>
                  <div className="pf-how-sub">Sin costo y sin compromiso.</div>
                </div>
              </div>
              <div className="pf-how-item">
                <div className="pf-how-num">3</div>
                <div>
                  <div className="pf-how-title">Tú decides</div>
                  <div className="pf-how-sub">Con claridad y a tu ritmo.</div>
                </div>
              </div>
            </div>

            <div className="pf-cta-row pf-cta-stack">
              <button
                type="button"
                className="pf-btn-primary"
                onClick={() => goToBooking("callback")}
              >
                Quiero que me llamen ahora <span>→</span>
              </button>
              <button
                type="button"
                className="pf-btn-secondary"
                onClick={() => goToBooking("schedule")}
              >
                Prefiero agendar día y hora
              </button>
            </div>

            <p className="pf-consent">
              Al pedir la llamada aceptas que te contactemos por teléfono, SMS o
              WhatsApp. Sin costo y sin compromiso.
            </p>

            <a
              className="pf-btn-whatsapp"
              href={whatsappHref}
              onClick={trackWhatsApp}
              target="_blank"
              rel="noreferrer"
            >
              Prefiero escribirle por WhatsApp
            </a>

            <button type="button" className="pf-restart" onClick={restart}>
              Volver a comenzar
            </button>
          </div>
        </div>
      )}

      <div className="pf-footer">
        © 2026 Protección Familiar · JT Business Consulting
        <br />
        Este es un estimado informativo, no una cotización ni aprobación de una
        póliza.
      </div>
    </div>
  );
};
