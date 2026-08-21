import { useState } from "react";
import { useNavigate } from "react-router-dom";

const COVERAGE_OPTIONS = [50000, 100000, 150000, 250000, 500000, 1000000];

// Tabla de tarifas ilustrativa (dólares por cada $1,000 de cobertura, al mes).
// No son tarifas reales de ninguna aseguradora — son un estimado genérico
// calibrado para dar resultados creíbles como gancho de marketing.
// Ajustar aquí si el negocio da una tabla de tarifas real.
const RATE_TABLE = [
  { maxAge: 29, nonSmoker: 0.05, smoker: 0.09 },
  { maxAge: 39, nonSmoker: 0.07, smoker: 0.13 },
  { maxAge: 49, nonSmoker: 0.12, smoker: 0.22 },
  { maxAge: 59, nonSmoker: 0.25, smoker: 0.45 },
  { maxAge: 200, nonSmoker: 0.5, smoker: 0.9 },
];

const rateFor = (age, smoker) => {
  const bracket = RATE_TABLE.find((r) => age <= r.maxAge) || RATE_TABLE[RATE_TABLE.length - 1];
  return smoker ? bracket.smoker : bracket.nonSmoker;
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("35");
  const [coverage, setCoverage] = useState(250000);
  const [smoker, setSmoker] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculate = (e) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 18 || ageNum > 85) return;

    const rate = rateFor(ageNum, smoker);
    const monthly = (coverage / 1000) * rate;
    setResult(monthly);
  };

  const goToBooking = () => {
    navigate(
      `/agendar?coverage=${encodeURIComponent("Seguro de Vida a Término")}`,
    );
  };

  return (
    <div className="public-booking-screen">
      <div className="public-booking-intro">
        <h1>Calcula tu estimado de protección</h1>
        <p>
          En menos de un minuto ve cuánto podría costar proteger a tu familia.
          Es un estimado general — el precio final lo confirma tu asesor en la
          consulta gratuita.
        </p>
      </div>

      <form
        className="public-booking-card calculator-card"
        onSubmit={handleCalculate}
      >
        <label>
          Tu edad
          <input
            type="number"
            min="18"
            max="85"
            value={age}
            onChange={(e) => {
              setAge(e.target.value);
              setResult(null);
            }}
            required
          />
        </label>

        <label>
          Monto de cobertura deseado
          <select
            value={coverage}
            onChange={(e) => {
              setCoverage(Number(e.target.value));
              setResult(null);
            }}
          >
            {COVERAGE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                ${c.toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>

        <label className="calculator-checkbox">
          <input
            type="checkbox"
            checked={smoker}
            onChange={(e) => {
              setSmoker(e.target.checked);
              setResult(null);
            }}
          />
          Fumo o he fumado en los últimos 12 meses
        </label>

        <button type="submit">Calcular mi estimado</button>

        {result !== null && (
          <div className="calculator-result">
            <div className="calculator-result-amount">
              ${result.toFixed(2)} <span>al mes*</span>
            </div>
            <p className="calculator-result-disclaimer">
              *Estimado general, no es una cotización final. El precio real
              depende de tu salud y el plan que elijas — tu asesor te lo
              confirma en la consulta gratuita.
            </p>
            <button
              type="button"
              className="calculator-cta"
              onClick={goToBooking}
            >
              Agendar mi consulta gratis
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
