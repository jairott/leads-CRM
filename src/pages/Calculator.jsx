import { useState } from "react";
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

// PLACEHOLDER: reemplazar con la tabla real edad×monto→cobertura de Lisbeth
const COVERAGE_TABLE = {
  "18-34": { 35: 150000, 50: 220000, 75: 320000, 100: 420000 },
  "35-44": { 35: 130000, 50: 190000, 75: 280000, 100: 370000 },
  "45-54": { 35: 90000, 50: 140000, 75: 210000, 100: 290000 },
  "55-64": { 35: 60000, 50: 95000, 75: 150000, 100: 210000 },
  "65+": { 35: 15000, 50: 22000, 75: 32000, 100: 42000 },
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState(null);
  const [amt, setAmt] = useState(null);

  const coverage = age && amt ? COVERAGE_TABLE[age][amt] : null;

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
                  Este es exactamente lo que pagarías — sin cargos adicionales
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
                  <div className="r-label">Tu cobertura estimada</div>
                  <div className="r-amount">
                    {coverage ? `$${coverage.toLocaleString("en-US")}` : "$—"}
                  </div>
                  <div className="r-sub">
                    {amt
                      ? `con $${amt}/mes para proteger a tu familia`
                      : "para proteger a tu familia"}
                  </div>
                </div>
                <div className="result-note">
                  *Estimado inicial — tu asesora confirma el monto exacto en
                  la llamada
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
        Seguro de Protección Familiar · JT Business Consulting
        <br />
        Este es un estimado informativo, no una cotización final.
      </div>
    </div>
  );
};
