import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Usage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', service: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const result = await api('/api/usage/me', { params: filters });
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quota = data?.quota;
  const report = data?.report;
  const pct = quota ? Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100)) : 0;
  const maxTokens = report ? Math.max(...report.byService.map((row) => row.tokens), 1) : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Consumo de tokens</h1>
          <p>Tu cuota mensual y el detalle de consultas por servicio.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="grid cols-3">
        <div className="card stat">
          <div className="label">Limite</div>
          <div className="value">{quota ? quota.limit.toLocaleString() : '...'}</div>
        </div>
        <div className="card stat">
          <div className="label">Consumido</div>
          <div className="value">{quota ? quota.used.toLocaleString() : '...'}</div>
        </div>
        <div className="card stat">
          <div className="label">Disponible</div>
          <div className="value">{quota ? quota.remaining.toLocaleString() : '...'}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="split" style={{ marginBottom: 10 }}>
          <strong>Uso de la cuota mensual</strong>
          <span className="muted">{pct}%</span>
        </div>
        <div className="bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input
              className="input"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input
              className="input"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Servicio</label>
            <select
              className="select"
              value={filters.service}
              onChange={(event) => setFilters({ ...filters, service: event.target.value })}
            >
              <option value="">Todos</option>
              <option value="rag_chat">Chatbot RAG</option>
              <option value="agent_itinerary">Planificador</option>
              <option value="agent_adjust">Ajuste de viaje</option>
            </select>
          </div>
          <button className="btn primary" onClick={load}>
            Aplicar filtros
          </button>
        </div>
      </div>

      {report && (
        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Consumo por servicio</h3>
            {report.byService.length === 0 ? (
              <div className="empty">Sin datos.</div>
            ) : (
              <div className="chart-bars">
                {report.byService.map((row) => (
                  <div className="chart-row" key={row.serviceKey}>
                    <span className="name">{row.serviceName}</span>
                    <div className="bar">
                      <span style={{ width: `${(row.tokens / maxTokens) * 100}%` }} />
                    </div>
                    <span className="num">{row.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Detalle diario</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio</th>
                    <th>Consultas</th>
                    <th>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily.map((row, index) => (
                    <tr key={`${row.day}-${row.serviceKey}-${index}`}>
                      <td>{row.day}</td>
                      <td>{row.serviceName}</td>
                      <td>{row.calls}</td>
                      <td>{row.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                  {report.daily.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty">
                        Sin datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
