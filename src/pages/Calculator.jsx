import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Calculator.css";

const AGE_OPTIONS = [
  { value: "18-34", label: "18 – 34" },
  { value: "35-44", label: "35 – 44" },
  { value: "45-54", label: "45 – 54" },
  { value: "55-64", label: "55 – 64" },
  { value: "65+", label: "65 en adelante", wide: true },
];

const AMOUNT_OPTIONS = [
  { value: "35", label: "Desde" },
  { value: "50", label: "Aprox." },
  { value: "75", label: "Aprox." },
  { value: "100", label: "Aprox." },
];

// Tabla oficial de Quintero & Partners (monto mensual -> cobertura), verificada
// para dos edades de referencia: 35 y 50 años. Se interpola/extrapola el monto
// mensual elegido contra estos puntos oficiales. NO se inventan cifras fuera
// de este rango: si el monto elegido no cae dentro de la tabla, se muestra
// un aviso en vez de un número.
// TODO: pedir a Lisbeth/Quintero & Partners la tabla completa por rango de
// edad (45-54, 55-64, 65+) para reemplazar la aproximación de abajo.
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

// 18-34 y 35-44 se aproximan con la tabla de 35 años; 45-54 se aproxima con
// la tabla de 50 años (referencia más cercana disponible). 55-64 y 65+ no
// tienen tabla oficial cercana todavía, así que no se muestra un número.
const AGE_TO_TABLE = {
  "18-34": OFFICIAL_TABLE_35,
  "35-44": OFFICIAL_TABLE_35,
  "45-54": OFFICIAL_TABLE_50,
};

const estimateCoverage = (ageBucket, monthly) => {
  const table = AGE_TO_TABLE[ageBucket];
  if (!table) return null; // 55-64 y 65+: sin tabla oficial cercana aún
  if (monthly < table[0].monthly) return null; // fuera de rango por abajo
  if (monthly > table[table.length - 1].monthly) {
    return { capped: true, coverage: table[table.length - 1].coverage };
  }
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (monthly >= a.monthly && monthly <= b.monthly) {
      const frac = (monthly - a.monthly) / (b.monthly - a.monthly);
      const coverage = Math.round(
        (a.coverage + frac * (b.coverage - a.coverage)) / 100
      ) * 100;
      return { capped: false, coverage };
    }
  }
  return null;
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState(null);
  const [amt, setAmt] = useState(null);

  const estimate = age && amt ? estimateCoverage(age, Number(amt)) : null;
  const coverage = estimate ? estimate.coverage : null;

  // Meta Pixel: señal secundaria (no es un Lead real todavía, solo indica
  // que la persona terminó la calculadora). Útil para audiencias de
  // retargeting, no cuenta como conversión de Leads.
  useEffect(() => {
    if (
      step === 3 &&
      typeof window !== "undefined" &&
      typeof window.fbq === "function"
    ) {
      window.fbq("trackCustom", "CalculatorCompleted");
    }
  }, [step]);

  const goToBooking = () => {
    navigate("/agendar");
  };

  return (
    <div className="protect-calc">
      <div className="hero">
        <div className="wrap">
          <span className="eyebrow">Protección familiar</span>
          <h1>
            ¿Cuánto puedes proteger a <em>tu familia</em> con lo que ya tienes
            disponible?
          </h1>
          <p>
            Descubre tu cobertura estimada en menos de un minuto — sin
            compromiso, sin costo.
          </p>
          <div className="trust-row">
            <span className="trust-item">Sin down payment</span>
            <span className="trust-item">Toda la familia, un solo plan</span>
            <span className="trust-item">Para casi cualquier estatus</span>
          </div>
        </div>
      </div>

      <div className="wrap calc-section">
        <div className="calc-card">
          <div className="calc-head">
            <h2>Calcula tu cobertura</h2>
            <div className="sub">2 preguntas rápidas</div>
          </div>

          <div className="step-track">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`step-dot ${
                  step === n ? "active" : step > n ? "done" : ""
                }`}
              />
            ))}
          </div>

          <div className="calc-body">
            {step === 1 && (
              <div className="step active">
                <div className="q-label">¿Cuál es tu edad?</div>
                <div className="q-hint">
                  La edad influye en el precio de tu cobertura
                </div>
                <div className="option-grid">
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`option-btn ${age === opt.value ? "selected" : ""}`}
                      style={opt.wide ? { gridColumn: "span 2" } : undefined}
                      onClick={() => setAge(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="nav-row">
                  <span />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "auto", padding: "13px 28px" }}
                    disabled={!age}
                    onClick={() => setStep(2)}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="step active">
                <div className="q-label">
                  ¿Cuánto te gustaría pagar al mes?
                </div>
                <div className="q-hint">
                  Esto es una referencia de lo que podrías pagar
                </div>
                <div className="amount-row">
                  {AMOUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`amount-btn ${amt === opt.value ? "selected" : ""}`}
                      onClick={() => setAmt(opt.value)}
                    >
                      <span className="amt-label">{opt.label}</span>
                      <span className="amt">${opt.value}/mes</span>
                    </button>
                  ))}
                </div>
                <div className="nav-row">
                  <button
                    type="button"
                    className="btn-back"
                    onClick={() => setStep(1)}
                  >
                    ← Atrás
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "auto", padding: "13px 28px" }}
                    disabled={!amt}
                    onClick={() => setStep(3)}
                  >
                    Ver mi cobertura
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step active">
                <div className="result-badge">
                  {coverage ? (
                    <>
                      <div className="r-label">Tu cobertura estimada</div>
                      <div className="r-amount">
                        {estimate?.capped ? "Más de " : ""}
                        {`$${coverage.toLocaleString("en-US")}`}
                      </div>
                      <div className="r-sub">
                        {amt
                          ? `con $${amt}/mes para proteger a tu familia`
                          : "para proteger a tu familia"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="r-label">Tu cobertura estimada</div>
                      <div className="r-amount" style={{ fontSize: "1.4rem" }}>
                        Tu asesora te la confirma en la llamada
                      </div>
                      <div className="r-sub">
                        Con tu edad y presupuesto, lo mejor es revisarlo en
                        persona para darte el monto correcto.
                      </div>
                    </>
                  )}
                </div>
                <div className="result-note">
                  Estos montos son aproximados y se utilizan únicamente como
                  referencia. La cotización final dependerá de cada persona y
                  de su elegibilidad.
                </div>
                <div className="reassure-box">
                  <span>🛡️</span>
                  <span>
                    <b>No pagas nada hoy.</b> Solo se te cobra después de
                    confirmar tu elegibilidad — entre 24 y 48 horas después de
                    tu llamada.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-cta"
                  onClick={goToBooking}
                >
                  Agendar mi llamada gratis
                </button>
                <div className="cta-sub">
                  Sin compromiso · Respuesta el mismo día
                </div>
                <div className="nav-row" style={{ justifyContent: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn-back"
                    onClick={() => setStep(1)}
                  >
                    ← Volver a calcular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap section">
        <div className="section-title">Cómo funciona</div>
        <div className="how-grid">
          <div className="how-item">
            <div className="how-num">1</div>
            <div className="how-text">
              <h3>Calculas tu estimado</h3>
              <p>
                Nos dices tu edad y tu presupuesto — vemos qué cobertura te
                corresponde.
              </p>
            </div>
          </div>
          <div className="how-item">
            <div className="how-num">2</div>
            <div className="how-text">
              <h3>Agendas tu llamada</h3>
              <p>
                Hablas con tu asesora, confirmamos los detalles y respondemos
                tus preguntas.
              </p>
            </div>
          </div>
          <div className="how-item">
            <div className="how-num">3</div>
            <div className="how-text">
              <h3>Verificamos tu elegibilidad</h3>
              <p>
                Solo entonces se activa tu póliza — no se cobra nada antes de
                este paso.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        Protección Familiar · JT Business Consulting
        <br />
        Este es un estimado informativo, no una cotización final.
      </div>
    </div>
  );
};
