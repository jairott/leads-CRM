import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { PublicBooking } from "./pages/PublicBooking";
import { Calculator } from "./pages/Calculator";
import "./App.css";

// El CRM interno (login, dashboard, pipeline, calendario, inbox, contactos y
// el chequeo de sesion de Supabase Auth) va en su propio chunk. Un visitante
// que entra desde el anuncio a /calculadora o /agendar no debe descargar ni
// ejecutar nada de esa app interna — antes se bajaba todo junto en un solo
// bundle, lo que hacia mas lenta y pesada la carga de las paginas publicas
// justo en el trafico frio de anuncios (mobile, a veces con red lenta).
const CrmApp = lazy(() =>
  import("./CrmApp").then((m) => ({ default: m.CrmApp })),
);

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/agendar" element={<PublicBooking />} />
        <Route path="/calculadora" element={<Calculator />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={<div className="page-loading">Cargando...</div>}>
              <CrmApp />
            </Suspense>
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
