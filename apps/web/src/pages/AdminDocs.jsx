import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const empty = {
  title: '',
  source: 'Base de datos interna',
  category: 'general',
  content: '',
  active: true,
};

export default function AdminDocs() {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await api('/api/documents');
      setDocuments(data.documents);
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

  const edit = async (document) => {
    try {
      const data = await api(`/api/documents/${document.id}`);
      setEditingId(document.id);
      setForm({
        title: data.document.title,
        source: data.document.source,
        category: data.document.category,
        content: data.document.content,
        active: data.document.active,
      });
      setMessage('');
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingId) {
        const data = await api(`/api/documents/${editingId}`, { method: 'PUT', body: form });
        setMessage(`Documento actualizado e indexado (${data.indexing?.chunks ?? 0} chunks).`);
      } else {
        const data = await api('/api/documents', { method: 'POST', body: form });
        setMessage(`Documento creado e indexado (${data.indexing?.chunks ?? 0} chunks).`);
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const reindexAll = async () => {
    setError('');
    setMessage('Reindexando...');
    try {
      const data = await api('/api/documents/reindex', { method: 'POST' });
      setMessage(`${data.indexed} documentos reindexados.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Eliminar documento y sus chunks?')) return;
    try {
      await api(`/api/documents/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Documentos RAG</h1>
          <p>El contenido se divide en chunks y se indexa con embeddings para el chatbot.</p>
        </div>
        <button className="btn" onClick={reindexAll}>
          Reindexar todo
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert info">{message}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Editar documento' : 'Nuevo documento'}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Titulo</label>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Fuente</label>
                <input
                  className="input"
                  value={form.source}
                  onChange={(event) => setForm({ ...form, source: event.target.value })}
                />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Contenido</label>
              <textarea
                className="textarea"
                style={{ minHeight: 200 }}
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                required
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
                {editingId && (
                  <button type="button" className="btn ghost" onClick={reset}>
                    Cancelar
                  </button>
                )}
                <button className="btn primary">{editingId ? 'Guardar' : 'Crear e indexar'}</button>
              </div>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Corpus ({documents.length})</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Categoria</th>
                  <th>Chunks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      {document.title}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {document.source}
                      </div>
                    </td>
                    <td>
                      <span className="badge">{document.category}</span>
                    </td>
                    <td>{document.chunks}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn small" onClick={() => edit(document)}>
                          Editar
                        </button>
                        <button className="btn small danger" onClick={() => remove(document.id)}>
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
    </>
  );
}
