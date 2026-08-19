import { NavLink, Outlet } from "react-router-dom";
import { Kanban, MessageCircle, Users, LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Layout = () => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Leads CRM</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            <Kanban size={18} />
            Pipeline
          </NavLink>
          <NavLink to="/inbox" className="sidebar-link">
            <MessageCircle size={18} />
            Bandeja
          </NavLink>
          <NavLink to="/contacts" className="sidebar-link">
            <Users size={18} />
            Contactos
          </NavLink>
        </nav>
        <button className="sidebar-logout" onClick={() => supabase.auth.signOut()}>
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};
