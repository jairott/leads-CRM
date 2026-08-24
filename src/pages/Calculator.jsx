import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Calculator.css";

// Evaluación de 5 preguntas — mismo diseño/copy de la página de referencia
// (evaluacion-proteccion-familiar), adaptada para usar la infraestructura
// que ya tenemos: WhatsApp con Liz + /agendar (que sí guarda el lead en
// Supabase y dispara el evento Lead de Meta Pixel).
//
// Nota de cumplimiento: la pregunta 4 original decía "seguro de vida o
// protección familiar" — se cambió a "póliza o protección familiar" para
// respetar la regla de la marca de nunca usar "seguro de vida".

const Q1_OPTIONS = [
  { value: "nadie", icon: "○", label: "Nadie depende de mí", weight: 0 },
  { value: "pareja", icon: "♥", label: "Mi pareja", weight: 1 },
  { value: "hijos", icon: "✦", label: "Mis hijos", weight: 2 },
  { value: "todos", icon: "⌂", label: "Mi pareja, hijos u otros familiares", weight: 3 },
];

const Q2_OPTIONS = [
  { value: "0", icon: "0", label: "Ninguno", weight: 0 },
  { value: "1", icon: "1", label: "1 dependiente", weight: 1 },
  { value: "2", icon: "2", label: "2 dependientes", weight: 2 },
  { value: "3+", icon: "3+", label: "3 o más", weight: 3 },
];

const Q3_OPTIONS = [
  { value: "<1", icon: "1", label: "Menos de 1 mes", weight: 3 },
  { value: "1-3", icon: "3", label: "Entre 1 y 3 meses", weight: 2 },
  { value: "4-6", icon: "6", label: "Entre 4 y 6 meses", weight: 1 },
  { value: "6+", icon: "6+", label: "Más de 6 meses", weight: 0 },
];

const Q4_OPTIONS = [
  { value: "exacto", icon: "✓", label: "Sí, sé exactamente qué tengo", weight: 0 },
  { value: "no_se_cuanto", icon: "?", label: "Sí, pero no sé cuánto cubre", weight: 1 },
  { value: "no_tengo", icon: "—", label: "No tengo protección", weight: 3 },
  { value: "no_seguro", icon: "?", label: "No estoy seguro", weight: 2 },
];

const Q5_OPTIONS = [
  {
    value: "gastos_finales",
    icon: "✦",
    label: "Gastos finales",
    resultText: "cubrir gastos finales",
    coverage: "Protección de Gastos Finales",
  },
  {
    value: "ingresos",
    icon: "$",
    label: "Los ingresos de mi familia",
    resultText: "proteger los ingresos de tu familia",
    coverage: "No sé / necesito orientación",
  },
  {
    value: "casa",
    icon: "⌂",
    label: "Mi casa y otras deudas",
    resultText: "proteger tu casa y tus deudas",
    coverage: "Protección Hipotecaria",
  },
  {
    value: "hijos_futuro",
    icon: "↑",
    label: "El futuro de mis hijos",
    resultText: "proteger el futuro de tus hijos",
    coverage: "No sé / necesito orientación",
  },
];

const STEPS_TOTAL = 5;

const scoreToResult = (score) => {
  if (score >= 7) return { badge: "PRIORIDAD ALTA" };
  if (score >= 4) return { badge: "PRIORIDAD MEDIA" };
  return { badge: "BUENA BASE" };
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = intro, 1-5 = preguntas, 6 = resultado
  const [answers, setAnswers] = useState({});

  const setAnswer = (q, opt) => {
    setAnswers((prev) => ({ ...prev, [q]: opt }));
    setTimeout(() => setStep((s) => s + 1), 150);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const score =
    (answers.q1?.weight || 0) +
    (answers.q2?.weight || 0) +
    (answers.q3?.weight || 0) +
    (answers.q4?.weight || 0);

  const result = scoreToResult(score);
  const priorityChoice = answers.q5;

  // Meta Pixel: señal secundaria (no es un Lead real todavía, solo indica
  // que la persona terminó la evaluación). Igual que la calculadora anterior.
  useEffect(() => {
    if (
      step === 6 &&
      typeof window !== "undefined" &&
      typeof window.fbq === "function"
    ) {
      window.fbq("trackCustom", "CalculatorCompleted");
    }
  }, [step]);

  const goToBooking = () => {
    const coverage = priorityChoice?.coverage || "No sé / necesito orientación";
    navigate(`/agendar?coverage=${encodeURIComponent(coverage)}`);
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
      label: "¿Quién depende económicamente de ti?",
      hint: "Selecciona la opción que más se parece a tu situación actual.",
      options: Q1_OPTIONS,
      key: "q1",
    },
    {
      n: 2,
      eyebrow: "PERSONAS IMPORTANTES",
      label: "¿Cuántos hijos o dependientes tienes?",
      hint: "Esto nos ayuda a entender el nivel de responsabilidad que proteges.",
      options: Q2_OPTIONS,
      key: "q2",
    },
    {
      n: 3,
      eyebrow: "ESTABILIDAD",
      label: "Si faltara tu ingreso, ¿cuánto tiempo podría mantenerse tu familia?",
      hint: "No hay respuestas buenas o malas. Queremos darte una orientación útil.",
      options: Q3_OPTIONS,
      key: "q3",
    },
    {
      n: 4,
      eyebrow: "PROTECCIÓN ACTUAL",
      label: "¿Actualmente tienes alguna póliza o protección familiar?",
      hint: "Aunque ya tengas protección, conviene revisar si todavía corresponde a tu realidad.",
      options: Q4_OPTIONS,
      key: "q4",
    },
    {
      n: 5,
      eyebrow: "TU PRIORIDAD",
      label: "¿Qué es lo más importante que quieres proteger?",
      hint: "Tu respuesta nos permitirá enfocar la orientación en lo que realmente te importa.",
      options: Q5_OPTIONS,
      key: "q5",
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
          <div className="pf-eyebrow">EVALUACIÓN GRATUITA · 2 MINUTOS</div>
          <h1>
            ¿Tu familia estaría protegida si mañana faltara tu ingreso?
          </h1>
          <p>
            Responde cinco preguntas sencillas y descubre qué áreas conviene
            revisar para cuidar a quienes más amas.
          </p>
          <button
            type="button"
            className="pf-btn-primary"
            onClick={() => setStep(1)}
          >
            Comenzar mi evaluación <span>→</span>
          </button>
          <div className="pf-trust-row">
            <span>✓ Sin compromiso</span>
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
                  key={opt.value}
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

      {step === 6 && (
        <div className="pf-result-wrap">
          <div className="pf-result-card">
            <div className="pf-result-badges">
              <span className="pf-badge-done">✓ Evaluación completada</span>
              <span className="pf-badge-priority">RESULTADO: {result.badge}</span>
            </div>
            <h2>Dar este paso ya es una forma de proteger a tu familia.</h2>
            <p>
              Según tus respuestas, recomendamos revisar una estrategia
              enfocada en{" "}
              <b>{priorityChoice?.resultText || "proteger a tu familia"}</b>.
              Una asesora puede ayudarte a entender alternativas de acuerdo
              con tus necesidades y presupuesto.
            </p>
            <div className="pf-how-grid">
              <div className="pf-how-item">
                <div className="pf-how-num">1</div>
                <div>
                  <div className="pf-how-title">Revisamos tu situación</div>
                  <div className="pf-how-sub">Sin costo y sin compromiso.</div>
                </div>
              </div>
              <div className="pf-how-item">
                <div className="pf-how-num">2</div>
                <div>
                  <div className="pf-how-title">Comparamos alternativas</div>
                  <div className="pf-how-sub">Explicadas en palabras sencillas.</div>
                </div>
              </div>
              <div className="pf-how-item">
                <div className="pf-how-num">3</div>
                <div>
                  <div className="pf-how-title">Tú decides</div>
                  <div className="pf-how-sub">Con claridad y a tu propio ritmo.</div>
                </div>
              </div>
            </div>
            <div className="pf-cta-row">
              <a
                className="pf-btn-primary pf-btn-whatsapp"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                Hablar con Liz por WhatsApp <span>→</span>
              </a>
              <button
                type="button"
                className="pf-btn-secondary"
                onClick={goToBooking}
              >
                Agendar consulta gratuita
              </button>
            </div>
            <button type="button" className="pf-restart" onClick={restart}>
              Volver a comenzar
            </button>
          </div>
        </div>
      )}

      <div className="pf-footer">
        © 2026 Protección Familiar · JT Business Consulting
        <br />
        Este es un estimado informativo, no una cotización ni aprobación de
        una póliza.
      </div>
    </div>
  );
};
