import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function History() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '' });

  const load = async () => {
    try {
      const data = await api('/api/usage/history', { params: filters });
      setHistory(data.history);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = async (id) => {
    setSelected(id);
    try {
      const data = await api(`/api/chat/conversations/${id}`);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Historial de conversaciones</h1>
          <p>Cada conversacion del chatbot queda registrada con sus mensajes y tokens.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
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
          <button className="btn primary" onClick={load}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Conversaciones</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Servicio</th>
                  <th>Mensajes</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => open(item.id)}
                    style={{ cursor: 'pointer' }}
                    className={selected === item.id ? 'active' : ''}
                  >
                    <td>{item.title}</td>
                    <td>
                      <span className="badge">{item.service.name}</span>
                    </td>
                    <td>{item.messages}</td>
                    <td className="muted">{new Date(item.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">
                      Sin conversaciones en el periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Detalle</h3>
          {!selected && <div className="empty">Selecciona una conversacion.</div>}
          {selected && (
            <div className="messages" style={{ maxHeight: '60vh' }}>
              {messages.map((message) => (
                <div key={message.id} className={`msg ${message.role}`}>
                  {message.content}
                  <div className="meta">{message.tokens} tokens</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
