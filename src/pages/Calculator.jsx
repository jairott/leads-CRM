import { useState } from "react";
import { useNavigate } from "react-router-dom";

const COVERAGE_OPTIONS = [5000, 10000, 15000, 20000, 25000, 30000, 40000];

// Tabla de tarifas ilustrativa (dólares por cada $1,000 de cobertura, al mes)
// para Seguro de Gastos Finales (final expense) — montos bajos, dirigido a
// adultos mayores. No son tarifas reales de ninguna aseguradora, son un
// estimado genérico calibrado por edad. Ajustar aquí si el negocio da una
// tabla de tarifas real de Quintero & Partners / American Income Life.
const RATE_TABLE = [
  { maxAge: 59, nonSmoker: 2.5, smoker: 3.5 },
  { maxAge: 64, nonSmoker: 3.2, smoker: 4.5 },
  { maxAge: 69, nonSmoker: 4.0, smoker: 5.6 },
  { maxAge: 74, nonSmoker: 5.2, smoker: 7.3 },
  { maxAge: 79, nonSmoker: 7.0, smoker: 9.8 },
  { maxAge: 200, nonSmoker: 9.5, smoker: 13.3 },
];

const rateFor = (age, smoker) => {
  const bracket = RATE_TABLE.find((r) => age <= r.maxAge) || RATE_TABLE[RATE_TABLE.length - 1];
  return smoker ? bracket.smoker : bracket.nonSmoker;
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("65");
  const [coverage, setCoverage] = useState(15000);
  const [smoker, setSmoker] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculate = (e) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 40 || ageNum > 90) return;

    const rate = rateFor(ageNum, smoker);
    const monthly = (coverage / 1000) * rate;
    setResult(monthly);
  };

  const goToBooking = () => {
    navigate(
      `/agendar?coverage=${encodeURIComponent("Seguro de Gastos Finales")}`,
    );
  };

  return (
    <div className="public-booking-screen">
      <div className="public-booking-intro">
        <h1>Calcula tu estimado de Seguro de Gastos Finales</h1>
        <p>
          En menos de un minuto ve cuánto podría costar cubrir los gastos
          funerarios y de cierre de vida, para que tu familia no tenga que
          preocuparse por eso. Es un estimado general — el precio final lo
          confirma tu asesor en la consulta gratuita.
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
            min="40"
            max="90"
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
