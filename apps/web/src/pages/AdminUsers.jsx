import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const empty = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  token_limit: 50000,
  active: true,
};

export default function AdminUsers() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await api('/api/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditingId(null);
  };

  const edit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      token_limit: user.tokenLimit,
      active: user.active,
    });
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const body = { ...form, token_limit: Number(form.token_limit) };
      if (!body.password) delete body.password;
      if (editingId) {
        await api(`/api/users/${editingId}`, { method: 'PUT', body });
        setMessage('Usuario actualizado.');
      } else {
        await api('/api/users', { method: 'POST', body });
        setMessage('Usuario creado.');
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Eliminar este usuario?')) return;
    setError('');
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api(`/api/users/${user.id}`, {
        method: 'PUT',
        body: { active: !user.active },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p>Crea cuentas, asigna roles y define limites de consumo de tokens.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert info">{message}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Nombre</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>{editingId ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                {...(!editingId ? { required: true, minLength: 6 } : {})}
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Rol</label>
                <select
                  className="select"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="field">
                <label>Limite de tokens</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.token_limit}
                  onChange={(event) => setForm({ ...form, token_limit: event.target.value })}
                />
              </div>
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
                {editingId && (
                  <button type="button" className="btn ghost" onClick={reset}>
                    Cancelar
                  </button>
                )}
                <button className="btn primary">{editingId ? 'Guardar' : 'Crear'}</button>
              </div>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Usuarios ({users.length})</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Limite</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {user.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'admin' : ''}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.tokenLimit.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${user.active ? 'ok' : 'off'}`}>
                        {user.active ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn small" onClick={() => edit(user)}>
                          Editar
                        </button>
                        <button className="btn small" onClick={() => toggleActive(user)}>
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                        {user.id !== current?.id && (
                          <button className="btn small danger" onClick={() => remove(user.id)}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
