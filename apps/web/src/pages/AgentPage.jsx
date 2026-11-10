import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const config = {
  itinerary: {
    title: 'Planificador de itinerario',
    subtitle:
      'El agente busca destinos, consulta actividades, clima y distancias antes de proponer un plan.',
    endpoint: '/api/agents/itinerary',
    placeholder:
      'Ej: Quiero un viaje de 5 dias en Colombia con playa y cultura, presupuesto de 2000 USD por persona.',
    examples: [
      'Arma un itinerario de 4 dias para Cartagena con presupuesto de 2000 USD.',
      'Quiero 5 dias de aventura y naturaleza con clima templado y menos de 1800 USD.',
    ],
  },
  adjust: {
    title: 'Ajustar viaje',
    subtitle:
      'El agente busca alternativas, consulta el clima y recalcula el presupuesto ante nuevas condiciones.',
    endpoint: '/api/agents/adjust',
    placeholder:
      'Ej: Mi presupuesto bajo a 1200 USD y necesito evitar lluvias en el Caribe. Que alternativa me recomiendas?',
    examples: [
      'Mi presupuesto bajo a 1200 USD para 4 dias, busca alternativas economicas.',
      'Cambio el destino a uno templado, sin playa, para 3 dias con 1500 USD.',
    ],
  },
};

export default function AgentPage({ mode }) {
  const { title, subtitle, endpoint, placeholder, examples } = config[mode];
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (text) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await api(endpoint, { method: 'POST', body: { input: value } });
      setResult(data);
    } catch (err) {
      setError(
        err.code === 'TOKEN_LIMIT'
          ? 'Alcanzaste tu limite de tokens. Contacta al administrador para ampliarlo.'
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className="badge admin">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="field">
          <label>Describe tu solicitud</label>
          <textarea
            className="textarea"
            placeholder={placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <div className="split">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {examples.map((example) => (
              <button key={example} className="btn small ghost" onClick={() => run(example)}>
                {example}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => run()} disabled={loading || !input.trim()}>
            {loading ? 'Ejecutando agente...' : 'Ejecutar agente'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="typing">
            El agente esta decidiendo que herramientas usar y consultando fuentes externas...
          </div>
        </div>
      )}

      {result && (
        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="split">
              <h3 style={{ margin: 0 }}>Respuesta del agente</h3>
              <span className="badge ok">{result.tokens?.used} tokens</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginTop: 14 }}>
              {result.output}
            </div>
            <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
              Herramientas usadas: {result.toolsUsed?.join(', ') || 'ninguna'} · Tokens restantes:{' '}
              {result.tokens?.remaining}
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Pasos ejecutados ({result.steps?.length || 0})</h3>
            {result.steps?.length === 0 && (
              <div className="empty">
                El modelo respondio sin invocar herramientas (revisa GROQ_API_KEY).
              </div>
            )}
            {result.steps?.map((step) => (
              <div className="step" key={step.step}>
                <div className="tool">
                  {step.step}. {step.tool}
                </div>
                <pre>{JSON.stringify(step.arguments, null, 2)}</pre>
                <pre>{JSON.stringify(step.result, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
