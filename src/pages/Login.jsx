import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("sign-in");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "sign-up") {
      setInfo("Cuenta creada. Ya puedes iniciar sesión.");
      setMode("sign-in");
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Leads CRM</h1>
        <p className="auth-subtitle">
          {mode === "sign-in" ? "Inicia sesión" : "Crea tu cuenta"}
        </p>

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Cargando..." : mode === "sign-in" ? "Entrar" : "Crear cuenta"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in"
            ? "¿No tienes cuenta? Créala"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
    </div>
  );
};
