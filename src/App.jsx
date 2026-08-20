import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pipeline } from "./pages/Pipeline";
import { Inbox } from "./pages/Inbox";
import { Contacts } from "./pages/Contacts";
import "./App.css";

const RequireAuth = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="page-loading">Cargando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
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
        <Route path="inbox" element={<Inbox />} />
        <Route path="contacts" element={<Contacts />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
