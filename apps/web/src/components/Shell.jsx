import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Brand from './Brand.jsx';

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

export default function Shell() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />

        <nav className="nav-group">
          <div className="nav-title">Servicios de IA</div>
          <NavLink to="/" end className={linkClass}>
            Inicio
          </NavLink>
          <NavLink to="/chat" className={linkClass}>
            Chatbot con RAG
          </NavLink>
          <NavLink to="/itinerary" className={linkClass}>
            Planificador de itinerario
          </NavLink>
          <NavLink to="/adjust" className={linkClass}>
            Ajustar viaje
          </NavLink>
        </nav>

        <nav className="nav-group">
          <div className="nav-title">Mi actividad</div>
          <NavLink to="/history" className={linkClass}>
            Historial
          </NavLink>
          <NavLink to="/usage" className={linkClass}>
            Consumo de tokens
          </NavLink>
        </nav>

        {isAdmin && (
          <nav className="nav-group">
            <div className="nav-title">Administracion</div>
            <NavLink to="/admin/users" className={linkClass}>
              Usuarios
            </NavLink>
            <NavLink to="/admin/services" className={linkClass}>
              Servicios de IA
            </NavLink>
            <NavLink to="/admin/data" className={linkClass}>
              Destinos y actividades
            </NavLink>
            <NavLink to="/admin/docs" className={linkClass}>
              Documentos RAG
            </NavLink>
            <NavLink to="/admin/reports" className={linkClass}>
              Reporte general
            </NavLink>
          </nav>
        )}

        <div className="sidebar-footer">
          <a className="nav-link" href="/api-docs" target="_blank" rel="noreferrer">
            Documentacion API (Swagger)
          </a>
          <div className="user-chip">
            <div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>
                {user?.role === 'admin' ? 'Administrador' : 'Usuario'} · {user?.email}
              </small>
            </div>
          </div>
          <button className="btn ghost" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
