import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Todos los números de esta página son estimados genéricos ilustrativos, NO
// tarifas reales de ninguna aseguradora. Sirven solo como gancho de marketing
// para dar una idea de rango antes de la consulta. Ajustar si el negocio
// tiene una tabla de tarifas real de Quintero & Partners / American Income Life.

const INSURANCE_TYPES = {
  "Seguro de Gastos Finales": {
    kind: "amount",
    minAge: 40,
    maxAge: 90,
    defaultAge: 65,
    coverageOptions: [5000, 10000, 15000, 20000, 25000, 30000, 40000],
    defaultCoverage: 15000,
    rateTable: [
      { maxAge: 59, nonSmoker: 2.5, smoker: 3.5 },
      { maxAge: 64, nonSmoker: 3.2, smoker: 4.5 },
      { maxAge: 69, nonSmoker: 4.0, smoker: 5.6 },
      { maxAge: 74, nonSmoker: 5.2, smoker: 7.3 },
      { maxAge: 79, nonSmoker: 7.0, smoker: 9.8 },
      { maxAge: 200, nonSmoker: 9.5, smoker: 13.3 },
    ],
  },
  "Seguro de Vida a Término": {
    kind: "amount",
    minAge: 18,
    maxAge: 65,
    defaultAge: 35,
    coverageOptions: [50000, 100000, 250000, 500000, 1000000],
    defaultCoverage: 250000,
    rateTable: [
      { maxAge: 29, nonSmoker: 0.05, smoker: 0.09 },
      { maxAge: 39, nonSmoker: 0.07, smoker: 0.13 },
      { maxAge: 49, nonSmoker: 0.12, smoker: 0.22 },
      { maxAge: 59, nonSmoker: 0.25, smoker: 0.45 },
      { maxAge: 200, nonSmoker: 0.5, smoker: 0.9 },
    ],
  },
  "Seguro de Vida Entera": {
    kind: "amount",
    minAge: 18,
    maxAge: 75,
    defaultAge: 40,
    coverageOptions: [10000, 25000, 50000, 100000, 250000],
    defaultCoverage: 50000,
    rateTable: [
      { maxAge: 29, nonSmoker: 0.11, smoker: 0.2 },
      { maxAge: 39, nonSmoker: 0.15, smoker: 0.28 },
      { maxAge: 49, nonSmoker: 0.26, smoker: 0.48 },
      { maxAge: 59, nonSmoker: 0.55, smoker: 0.99 },
      { maxAge: 200, nonSmoker: 1.1, smoker: 1.98 },
    ],
  },
  "Seguro de Vida para Niños": {
    kind: "amount",
    minAge: 0,
    maxAge: 17,
    defaultAge: 5,
    coverageOptions: [5000, 10000, 20000, 50000],
    defaultCoverage: 10000,
    rateTable: [{ maxAge: 200, nonSmoker: 0.15, smoker: 0.15 }],
  },
  "Seguro por Muerte Accidental": {
    kind: "amount",
    minAge: 18,
    maxAge: 70,
    defaultAge: 35,
    coverageOptions: [50000, 100000, 250000, 500000],
    defaultCoverage: 100000,
    rateTable: [{ maxAge: 200, nonSmoker: 0.03, smoker: 0.03 }],
  },
  "Seguro de Protección Hipotecaria": {
    kind: "amount",
    minAge: 21,
    maxAge: 65,
    defaultAge: 40,
    coverageOptions: [100000, 200000, 300000, 400000, 500000],
    defaultCoverage: 250000,
    rateTable: [
      { maxAge: 39, nonSmoker: 0.09, smoker: 0.16 },
      { maxAge: 49, nonSmoker: 0.15, smoker: 0.27 },
      { maxAge: 59, nonSmoker: 0.28, smoker: 0.5 },
      { maxAge: 200, nonSmoker: 0.5, smoker: 0.9 },
    ],
  },
  "Seguro contra el Cáncer": {
    kind: "flat",
    minAge: 18,
    maxAge: 85,
    defaultAge: 45,
    ranges: [
      { maxAge: 39, low: 15, high: 25 },
      { maxAge: 59, low: 25, high: 40 },
      { maxAge: 200, low: 40, high: 65 },
    ],
  },
  "Seguro de UCI": {
    kind: "flat",
    minAge: 18,
    maxAge: 85,
    defaultAge: 45,
    ranges: [
      { maxAge: 39, low: 12, high: 20 },
      { maxAge: 59, low: 20, high: 32 },
      { maxAge: 200, low: 32, high: 50 },
    ],
  },
  "Seguro de Enfermedad Crítica": {
    kind: "flat",
    minAge: 18,
    maxAge: 85,
    defaultAge: 45,
    ranges: [
      { maxAge: 39, low: 15, high: 24 },
      { maxAge: 59, low: 24, high: 38 },
      { maxAge: 200, low: 38, high: 60 },
    ],
  },
  "Seguro de Hospitalización": {
    kind: "flat",
    minAge: 18,
    maxAge: 85,
    defaultAge: 45,
    ranges: [
      { maxAge: 39, low: 10, high: 18 },
      { maxAge: 59, low: 18, high: 28 },
      { maxAge: 200, low: 28, high: 45 },
    ],
  },
  "Seguro por Accidentes": {
    kind: "flat",
    minAge: 18,
    maxAge: 85,
    defaultAge: 45,
    ranges: [
      { maxAge: 39, low: 8, high: 14 },
      { maxAge: 59, low: 14, high: 22 },
      { maxAge: 200, low: 22, high: 35 },
    ],
  },
  "No sé / necesito orientación": { kind: "none" },
};

const INSURANCE_TYPE_NAMES = Object.keys(INSURANCE_TYPES);

const rateFor = (table, age, smoker) => {
  const bracket = table.find((r) => age <= r.maxAge) || table[table.length - 1];
  return smoker ? bracket.smoker : bracket.nonSmoker;
};

const rangeFor = (ranges, age) => {
  return ranges.find((r) => age <= r.maxAge) || ranges[ranges.length - 1];
};

export const Calculator = () => {
  const navigate = useNavigate();
  const [type, setType] = useState("Seguro de Gastos Finales");
  const config = INSURANCE_TYPES[type];

  const [age, setAge] = useState(String(config.defaultAge ?? 40));
  const [coverage, setCoverage] = useState(config.defaultCoverage);
  const [smoker, setSmoker] = useState(false);
  const [result, setResult] = useState(null);

  const handleTypeChange = (newType) => {
    setType(newType);
    const newConfig = INSURANCE_TYPES[newType];
    setAge(String(newConfig.defaultAge ?? 40));
    if (newConfig.kind === "amount") setCoverage(newConfig.defaultCoverage);
    setResult(null);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (config.kind === "none") return;
    if (!ageNum || ageNum < (config.minAge ?? 0) || ageNum > (config.maxAge ?? 100)) return;

    if (config.kind === "amount") {
      const rate = rateFor(config.rateTable, ageNum, smoker);
      setResult({ kind: "amount", monthly: (coverage / 1000) * rate });
    } else if (config.kind === "flat") {
      const r = rangeFor(config.ranges, ageNum);
      const smokerMultiplier = smoker ? 1.4 : 1;
      setResult({
        kind: "flat",
        low: r.low * smokerMultiplier,
        high: r.high * smokerMultiplier,
      });
    }
  };

  const goToBooking = () => {
    navigate(`/agendar?coverage=${encodeURIComponent(type)}`);
  };

  return (
    <div className="public-booking-screen">
      <div className="public-booking-intro">
        <h1>Calcula tu estimado de protección</h1>
        <p>
          En menos de un minuto ve cuánto podría costar tu protección. Es un
          estimado general — el precio final lo confirma tu asesor en la
          consulta gratuita.
        </p>
      </div>

      <form
        className="public-booking-card calculator-card"
        onSubmit={handleCalculate}
      >
        <label>
          Tipo de seguro
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {INSURANCE_TYPE_NAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {config.kind !== "none" && (
          <>
            <label>
              Tu edad
              <input
                type="number"
                min={config.minAge}
                max={config.maxAge}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setResult(null);
                }}
                required
              />
            </label>

            {config.kind === "amount" && (
              <label>
                Monto de cobertura deseado
                <select
                  value={coverage}
                  onChange={(e) => {
                    setCoverage(Number(e.target.value));
                    setResult(null);
                  }}
                >
                  {config.coverageOptions.map((c) => (
                    <option key={c} value={c}>
                      ${c.toLocaleString("en-US")}
                    </option>
                  ))}
                </select>
              </label>
            )}

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
          </>
        )}

        {config.kind === "none" && (
          <p className="public-booking-subtitle">
            No hay problema — cuéntanos tu situación en la consulta gratuita y
            te orientamos sobre qué cobertura te conviene.
          </p>
        )}

        {result && (
          <div className="calculator-result">
            {result.kind === "amount" ? (
              <div className="calculator-result-amount">
                ${result.monthly.toFixed(2)} <span>al mes*</span>
              </div>
            ) : (
              <div className="calculator-result-amount">
                ${result.low.toFixed(0)}–${result.high.toFixed(0)}{" "}
                <span>al mes*</span>
              </div>
            )}
            <p className="calculator-result-disclaimer">
              *Estimado general, no es una cotización final. El precio real
              depende de tu salud y el plan que elijas — tu asesor te lo
              confirma en la consulta gratuita.
            </p>
          </div>
        )}

        {(result || config.kind === "none") && (
          <button
            type="button"
            className="calculator-cta"
            onClick={goToBooking}
          >
            Agendar mi consulta gratis
          </button>
        )}
      </form>
    </div>
  );
};
