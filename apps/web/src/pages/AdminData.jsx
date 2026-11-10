import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const emptyDestino = {
  nombre: '',
  region: '',
  pais: '',
  lat: '',
  lon: '',
  descripcion: '',
  precio_promedio: 0,
  clima: '',
  activo: true,
};

const emptyActividad = {
  destino_id: '',
  nombre: '',
  tipo: 'cultural',
  descripcion: '',
  costo: 0,
  duracion_hrs: 1,
  activo: true,
};

export default function AdminData() {
  const [tab, setTab] = useState('destinos');
  const [destinos, setDestinos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [destinoForm, setDestinoForm] = useState(emptyDestino);
  const [actividadForm, setActividadForm] = useState(emptyActividad);
  const [editingDestino, setEditingDestino] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [d, a] = await Promise.all([api('/api/destinos'), api('/api/actividades')]);
      setDestinos(d.destinos);
      setActividades(a.actividades);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitDestino = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const body = {
        ...destinoForm,
        lat: Number(destinoForm.lat),
        lon: Number(destinoForm.lon),
        precio_promedio: Number(destinoForm.precio_promedio),
      };
      if (editingDestino) {
        await api(`/api/destinos/${editingDestino}`, { method: 'PUT', body });
        setMessage('Destino actualizado.');
      } else {
        await api('/api/destinos', { method: 'POST', body });
        setMessage('Destino creado.');
      }
      setDestinoForm(emptyDestino);
      setEditingDestino(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editDestino = (destino) => {
    setEditingDestino(destino.id);
    setDestinoForm({
      nombre: destino.nombre,
      region: destino.region,
      pais: destino.pais,
      lat: destino.lat,
      lon: destino.lon,
      descripcion: destino.descripcion,
      precio_promedio: destino.precio_promedio,
      clima: destino.clima,
      activo: destino.activo,
    });
  };

  const removeDestino = async (id) => {
    if (!window.confirm('Eliminar destino y sus actividades?')) return;
    try {
      await api(`/api/destinos/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitActividad = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const body = {
        ...actividadForm,
        destino_id: Number(actividadForm.destino_id),
        costo: Number(actividadForm.costo),
        duracion_hrs: Number(actividadForm.duracion_hrs),
      };
      await api('/api/actividades', { method: 'POST', body });
      setMessage('Actividad creada.');
      setActividadForm(emptyActividad);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeActividad = async (id) => {
    if (!window.confirm('Eliminar actividad?')) return;
    try {
      await api(`/api/actividades/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Destinos y actividades</h1>
          <p>Datos propios que alimentan el RAG y las herramientas de los agentes.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert info">{message}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'destinos' ? ' active' : ''}`} onClick={() => setTab('destinos')}>
          Destinos ({destinos.length})
        </button>
        <button
          className={`tab${tab === 'actividades' ? ' active' : ''}`}
          onClick={() => setTab('actividades')}
        >
          Actividades ({actividades.length})
        </button>
      </div>

      {tab === 'destinos' && (
        <div className="grid cols-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{editingDestino ? 'Editar destino' : 'Nuevo destino'}</h3>
            <form onSubmit={submitDestino}>
              <div className="row">
                <div className="field">
                  <label>Nombre</label>
                  <input
                    className="input"
                    value={destinoForm.nombre}
                    onChange={(event) => setDestinoForm({ ...destinoForm, nombre: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Region</label>
                  <input
                    className="input"
                    value={destinoForm.region}
                    onChange={(event) => setDestinoForm({ ...destinoForm, region: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Pais</label>
                  <input
                    className="input"
                    value={destinoForm.pais}
                    onChange={(event) => setDestinoForm({ ...destinoForm, pais: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Precio promedio (USD)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={destinoForm.precio_promedio}
                    onChange={(event) =>
                      setDestinoForm({ ...destinoForm, precio_promedio: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Latitud</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={destinoForm.lat}
                    onChange={(event) => setDestinoForm({ ...destinoForm, lat: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Longitud</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={destinoForm.lon}
                    onChange={(event) => setDestinoForm({ ...destinoForm, lon: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>Clima</label>
                <input
                  className="input"
                  value={destinoForm.clima}
                  onChange={(event) => setDestinoForm({ ...destinoForm, clima: event.target.value })}
                  placeholder="Tropical calido, 27-32 C"
                />
              </div>
              <div className="field">
                <label>Descripcion</label>
                <textarea
                  className="textarea"
                  value={destinoForm.descripcion}
                  onChange={(event) =>
                    setDestinoForm({ ...destinoForm, descripcion: event.target.value })
                  }
                />
              </div>
              <div className="split">
                <label className="muted">
                  <input
                    type="checkbox"
                    checked={destinoForm.activo}
                    onChange={(event) => setDestinoForm({ ...destinoForm, activo: event.target.checked })}
                  />{' '}
                  Activo
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editingDestino && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setEditingDestino(null);
                        setDestinoForm(emptyDestino);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                  <button className="btn primary">Guardar</button>
                </div>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Destinos registrados</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Precio</th>
                    <th>Clima</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {destinos.map((destino) => (
                    <tr key={destino.id}>
                      <td>
                        {destino.nombre}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {destino.region}, {destino.pais}
                        </div>
                      </td>
                      <td>${destino.precio_promedio}</td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {destino.clima}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn small" onClick={() => editDestino(destino)}>
                            Editar
                          </button>
                          <button className="btn small danger" onClick={() => removeDestino(destino.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'actividades' && (
        <div className="grid cols-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Nueva actividad</h3>
            <form onSubmit={submitActividad}>
              <div className="field">
                <label>Destino</label>
                <select
                  className="select"
                  value={actividadForm.destino_id}
                  onChange={(event) =>
                    setActividadForm({ ...actividadForm, destino_id: event.target.value })
                  }
                  required
                >
                  <option value="">Selecciona un destino</option>
                  {destinos.map((destino) => (
                    <option key={destino.id} value={destino.id}>
                      {destino.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <div className="field">
                  <label>Nombre</label>
                  <input
                    className="input"
                    value={actividadForm.nombre}
                    onChange={(event) =>
                      setActividadForm({ ...actividadForm, nombre: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <input
                    className="input"
                    value={actividadForm.tipo}
                    onChange={(event) => setActividadForm({ ...actividadForm, tipo: event.target.value })}
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Costo (USD)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={actividadForm.costo}
                    onChange={(event) => setActividadForm({ ...actividadForm, costo: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Duracion (horas)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={actividadForm.duracion_hrs}
                    onChange={(event) =>
                      setActividadForm({ ...actividadForm, duracion_hrs: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>Descripcion</label>
                <textarea
                  className="textarea"
                  value={actividadForm.descripcion}
                  onChange={(event) =>
                    setActividadForm({ ...actividadForm, descripcion: event.target.value })
                  }
                />
              </div>
              <button className="btn primary">Crear actividad</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Actividades registradas</h3>
            <div className="table-wrap" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Destino</th>
                    <th>Costo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((actividad) => (
                    <tr key={actividad.id}>
                      <td>
                        {actividad.nombre}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {actividad.tipo} · {actividad.duracion_hrs} h
                        </div>
                      </td>
                      <td className="muted">{actividad.destino}</td>
                      <td>${actividad.costo}</td>
                      <td>
                        <button
                          className="btn small danger"
                          onClick={() => removeActividad(actividad.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
