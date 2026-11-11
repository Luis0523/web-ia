import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const SECTIONS = {
  '/': 'Inicio',
  '/chat': 'Chatbot con RAG',
  '/itinerary': 'Planificador de itinerario',
  '/adjust': 'Ajustar viaje',
  '/history': 'Historial',
  '/usage': 'Consumo de tokens',
  '/admin/users': 'Usuarios',
  '/admin/services': 'Servicios de IA',
  '/admin/data': 'Destinos y actividades',
  '/admin/docs': 'Documentos RAG',
  '/admin/reports': 'Reporte general',
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 13;

export default function Shell() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    api('/api/usage/me')
      .then((data) => setQuota(data.quota))
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const section = SECTIONS[location.pathname] || 'Panel';
  const limit = quota?.limit || 0;
  const remaining = quota?.remaining || 0;
  const remainingPct = limit > 0 ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))) : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - remainingPct / 100);

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />

        <nav className="nav-group">
          <div className="nav-title">
            <span>Servicios de IA</span>
            <span className="nav-badge">RAG v2</span>
          </div>
          <NavLink to="/" end className={linkClass}>
            <Icon name="home" />
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/chat" className={linkClass}>
            <Icon name="chat" />
            <span>Chatbot con RAG</span>
          </NavLink>
          <NavLink to="/itinerary" className={linkClass}>
            <Icon name="route" />
            <span>Planificador de itinerario</span>
          </NavLink>
          <NavLink to="/adjust" className={linkClass}>
            <Icon name="sliders" />
            <span>Ajustar viaje</span>
          </NavLink>
        </nav>

        <nav className="nav-group">
          <div className="nav-title">
            <span>Mi actividad</span>
          </div>
          <NavLink to="/history" className={linkClass}>
            <Icon name="clock" />
            <span>Historial</span>
          </NavLink>
          <NavLink to="/usage" className={linkClass}>
            <Icon name="bolt" />
            <span>Consumo de tokens</span>
            {quota && <span className="nav-badge">{remainingPct}%</span>}
          </NavLink>
        </nav>

        {isAdmin && (
          <nav className="nav-group">
            <div className="nav-title">
              <span>Administracion</span>
            </div>
            <NavLink to="/admin/users" className={linkClass}>
              <Icon name="users" />
              <span>Usuarios</span>
            </NavLink>
            <NavLink to="/admin/services" className={linkClass}>
              <Icon name="cpu" />
              <span>Servicios de IA</span>
            </NavLink>
            <NavLink to="/admin/data" className={linkClass}>
              <Icon name="map" />
              <span>Destinos y actividades</span>
            </NavLink>
            <NavLink to="/admin/docs" className={linkClass}>
              <Icon name="file" />
              <span>Documentos RAG</span>
            </NavLink>
            <NavLink to="/admin/reports" className={linkClass}>
              <Icon name="chart" />
              <span>Reporte general</span>
            </NavLink>
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="docs-card">
            <strong>
              <Icon name="code" />
              Documentacion API
            </strong>
            <p>Conecta tus fuentes RAG o consulta via Swagger OpenAPI.</p>
            <a href="/api-docs" target="_blank" rel="noreferrer">
              Abrir Swagger
              <Icon name="external" className="icon-sm" />
            </a>
          </div>

          <div className="user-chip">
            <div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <small>
                {user?.role === 'admin' ? 'Administrador' : 'Usuario'} · {user?.email}
              </small>
            </div>
            <button className="icon-btn" onClick={handleLogout} title="Cerrar sesion" aria-label="Cerrar sesion">
              <Icon name="logout" className="icon-sm" />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-wrap">
        <div className="maya-ribbon" />
        <header className="topbar">
          <div className="topbar-crumb">
            <span className="crumb-root">Web IA</span>
            <Icon name="chevron" />
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <ThemeToggle showLabel />
            <span className="status-pill">
              <span className="dot" />
              RAG activo
            </span>
            {quota && (
              <div className="token-widget" title="Tokens restantes de tu cuota mensual">
                <div className="ring">
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="transparent"
                      stroke="rgba(148, 163, 184, 0.28)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="transparent"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <span className="ring-label">{remainingPct}%</span>
                </div>
                <div>
                  <div className="tw-label">Tokens restantes</div>
                  <div className="tw-value">
                    {remaining.toLocaleString()}{' '}
                    <span>/ {limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
