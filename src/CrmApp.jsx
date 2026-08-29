import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pipeline } from "./pages/Pipeline";
import { Calendar } from "./pages/Calendar";
import { Inbox } from "./pages/Inbox";
import { Contacts } from "./pages/Contacts";

// Todo lo de aca adentro es la app interna (requiere login con Supabase Auth).
// Vive en su propio chunk para que las paginas publicas (calculadora, agendar)
// no tengan que descargar ni ejecutar nada de esto.

const RequireAuth = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="page-loading">Cargando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

const CrmRoutes = () => {
  const { session, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? (
            <div className="page-loading">Cargando...</div>
          ) : session ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="contacts" element={<Contacts />} />
      </Route>
    </Routes>
  );
};

export const CrmApp = () => (
  <AuthProvider>
    <CrmRoutes />
  </AuthProvider>
);
