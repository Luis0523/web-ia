import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminReports() {
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({ userId: '', from: '', to: '', service: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await api('/api/usage/admin/usage', { params: filters });
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    api('/api/users')
      .then((data) => setUsers(data.users))
      .catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxTokens = report ? Math.max(...report.byService.map((row) => row.tokens), 1) : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reporte general de consumo</h1>
          <p>Consultas y tokens acumulados por servicio, usuario y fecha.</p>
        </div>
        <a className="btn" href="/api-docs" target="_blank" rel="noreferrer">
          Ver API
        </a>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Usuario</label>
            <select
              className="select"
              value={filters.userId}
              onChange={(event) => setFilters({ ...filters, userId: event.target.value })}
            >
              <option value="">Todos</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
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
            Aplicar
          </button>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card stat">
          <div className="label">Consultas totales</div>
          <div className="value">{report ? report.totals.calls.toLocaleString() : '...'}</div>
        </div>
        <div className="card stat">
          <div className="label">Tokens acumulados</div>
          <div className="value">{report ? report.totals.tokens.toLocaleString() : '...'}</div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Por servicio</h3>
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
              <h3 style={{ marginTop: 0 }}>Por usuario</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Consultas</th>
                      <th>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUser.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          {row.userName}
                          <div className="muted" style={{ fontSize: 12 }}>
                            {row.userEmail}
                          </div>
                        </td>
                        <td>{row.calls}</td>
                        <td>{row.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
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
                        Sin datos en el periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alert info" style={{ marginTop: 16 }}>
            Power BI consume estos mismos datos desde{' '}
            <span className="mono">GET /api/bi/usage</span> con el header{' '}
            <span className="mono">x-api-key</span>, usando los filtros fecha y servicio.
          </div>
        </>
      )}
    </>
  );
}
