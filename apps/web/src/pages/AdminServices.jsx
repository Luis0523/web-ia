import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await api('/api/services');
      setServices(data.services);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (service) => {
    try {
      await api(`/api/services/${service.id}/status`, {
        method: 'PATCH',
        body: { active: !service.active },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (service) => {
    setForm({ ...service, config: JSON.stringify(service.config || {}, null, 2) });
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const body = {
        key: form.key,
        name: form.name,
        description: form.description,
        provider: form.provider,
        model: form.model,
        system_prompt: form.system_prompt,
        active: form.active,
        config: JSON.parse(form.config || '{}'),
      };
      await api(`/api/services/${form.id}`, { method: 'PUT', body });
      setMessage('Servicio actualizado.');
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Servicios de IA</h1>
          <p>Activa o desactiva servicios y ajusta el modelo o el prompt del sistema.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert info">{message}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Configuracion</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Modelo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      {service.name}
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        {service.key}
                      </div>
                    </td>
                    <td className="mono">{service.model}</td>
                    <td>
                      <span className={`badge ${service.active ? 'ok' : 'off'}`}>
                        {service.active ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn small" onClick={() => edit(service)}>
                          Editar
                        </button>
                        <button className="btn small" onClick={() => toggle(service)}>
                          {service.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          {!form && <div className="empty">Selecciona un servicio para editarlo.</div>}
          {form && (
            <form onSubmit={save}>
              <h3 style={{ marginTop: 0 }}>Editar {form.name}</h3>
              <div className="field">
                <label>Modelo</label>
                <input
                  className="input"
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                />
              </div>
              <div className="field">
                <label>Descripcion</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
              <div className="field">
                <label>Prompt del sistema</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 130 }}
                  value={form.system_prompt}
                  onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
                />
              </div>
              <div className="field">
                <label>Config (JSON)</label>
                <textarea
                  className="textarea mono"
                  value={form.config}
                  onChange={(event) => setForm({ ...form, config: event.target.value })}
                />
              </div>
              <div className="split">
                <label className="muted">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  />{' '}
                  Activo
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn ghost" onClick={() => setForm(null)}>
                    Cancelar
                  </button>
                  <button className="btn primary">Guardar</button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
