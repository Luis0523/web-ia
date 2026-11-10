import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/usage/me')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const quota = data?.quota;
  const report = data?.report;
  const pct = quota ? Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100)) : 0;

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">Tu proximo viaje empieza aqui</span>
          <h1>Hola, {user?.name}</h1>
          <p>Consulta destinos, arma itinerarios y ajusta tu presupuesto con asistencia de IA.</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/chat">
              Preguntar al asistente
            </Link>
            <Link className="btn ghost" to="/itinerary">
              Planificar viaje
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 340 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="262" cy="46" r="22" className="sun" />
            <path d="M0 148 62 74l42 48 34-38 58 64H0Z" className="mountain-back" />
            <path d="M96 156 176 58l56 68 30-30 58 60H96Z" className="mountain-front" />
            <path d="M0 158c34-10 58-10 92 0s58 10 92 0 58-10 92 0 42 7 64 2" className="wave" />
            <path d="M0 170c34-10 58-10 92 0s58 10 92 0 58-10 92 0 42 7 64 2" className="wave wave-2" />
          </svg>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <div className="grid cols-3">
        <div className="card stat">
          <div className="label">Tokens usados</div>
          <div className="value">{quota ? quota.used.toLocaleString() : '...'}</div>
          <div className="hint">de {quota ? quota.limit.toLocaleString() : '...'} disponibles</div>
        </div>
        <div className="card stat">
          <div className="label">Tokens restantes</div>
          <div className="value">{quota ? quota.remaining.toLocaleString() : '...'}</div>
          <div className="hint">Se renueva el primer dia del mes</div>
        </div>
        <div className="card stat">
          <div className="label">Consultas registradas</div>
          <div className="value">{report ? report.totals.calls : '...'}</div>
          <div className="hint">En el periodo actual</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="split" style={{ marginBottom: 10 }}>
          <strong>Uso de la cuota</strong>
          <span className="muted">{pct}%</span>
        </div>
        <div className="bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Servicios disponibles</h3>
          <div className="grid" style={{ gap: 10 }}>
            <Link className="conv-item" to="/chat">
              <strong>Chatbot con RAG</strong>
              <small>Preguntas sobre destinos, actividades, clima y presupuesto.</small>
            </Link>
            <Link className="conv-item" to="/itinerary">
              <strong>Planificador de itinerario</strong>
              <small>Busca destinos, clima y distancias para armar un plan.</small>
            </Link>
            <Link className="conv-item" to="/adjust">
              <strong>Ajustar viaje</strong>
              <small>Recalcula el plan ante cambios de presupuesto o clima.</small>
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Consumo por servicio</h3>
          {!report || report.byService.length === 0 ? (
            <div className="empty">Aun no hay consultas registradas.</div>
          ) : (
            <div className="chart-bars">
              {report.byService.map((row) => {
                const max = Math.max(...report.byService.map((item) => item.tokens), 1);
                return (
                  <div className="chart-row" key={row.serviceKey}>
                    <span className="name">{row.serviceName}</span>
                    <div className="bar">
                      <span style={{ width: `${(row.tokens / max) * 100}%` }} />
                    </div>
                    <span className="num">{row.tokens.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
          {isAdmin && (
            <p className="muted" style={{ marginBottom: 0 }}>
              Como administrador puedes ver el reporte general en{' '}
              <Link to="/admin/reports" style={{ color: 'var(--accent)' }}>
                Reporte general
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </>
  );
}
