import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';

const suggestions = [
  { emoji: '🏛️', text: 'Que destinos recomiendas para un viaje cultural con presupuesto medio?' },
  { emoji: '⛰️', text: 'Cual es la mejor temporada para visitar Cusco?' },
  { emoji: '🏖️', text: 'Que actividades hay en Cartagena y cuanto cuestan?' },
  { emoji: '☕', text: 'Arma un itinerario de 4 dias en Antigua Guatemala.' },
];

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = async () => {
    try {
      const data = await api('/api/chat/conversations');
      setConversations(data.conversations);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadConversations();
    api('/api/usage/me')
      .then((data) => setQuota(data.quota))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const selectConversation = async (id) => {
    setError('');
    setActiveId(id);
    try {
      const data = await api(`/api/chat/conversations/${id}`);
      setMessages(
        data.messages.map((message) => ({ role: message.role, content: message.content })),
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setError('');
    setInput('');
    inputRef.current?.focus();
  };

  const useSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setError('');
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setSending(true);

    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: { message, conversationId: activeId || undefined },
      });
      if (!activeId) setActiveId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          insufficient: data.insufficient,
          tokens: data.tokens,
        },
      ]);
      setQuota({
        limit: data.tokens.limit,
        used: data.tokens.totalUsed,
        remaining: data.tokens.remaining,
      });
      loadConversations();
    } catch (err) {
      setError(
        err.code === 'TOKEN_LIMIT'
          ? 'Alcanzaste tu limite de tokens. Contacta al administrador para ampliarlo.'
          : err.message,
      );
    } finally {
      setSending(false);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? conversations.filter(
        (conversation) =>
          conversation.title?.toLowerCase().includes(term) ||
          conversation.service?.name?.toLowerCase().includes(term),
      )
    : conversations;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Asistente de Viajes con RAG</h1>
          <p>Respuestas basadas en los destinos y documentos registrados en la base de datos.</p>
        </div>
        <span className="badge admin">Guatemala Travel Engine</span>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="chat-layout">
        <section className="card convs-panel">
          <div className="convs-head">
            <div>
              <h2>Conversaciones</h2>
              <p>{conversations.length} sesiones guardadas</p>
            </div>
            <button className="btn small primary" onClick={newConversation}>
              <Icon name="plus" className="icon-sm" />
              Nueva
            </button>
          </div>

          <div className="conv-search">
            <div className="search-box">
              <Icon name="search" />
              <input
                type="search"
                placeholder="Buscar consultas previas..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="conv-list">
            {filtered.length === 0 && (
              <div className="empty">{term ? 'Sin resultados.' : 'Sin conversaciones.'}</div>
            )}
            {filtered.map((conversation) => (
              <div
                key={conversation.id}
                className={`conv-item${activeId === conversation.id ? ' active' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                {conversation.title}
                <small>
                  <Icon name="chat" className="icon-sm" />
                  {conversation.service.name} · {conversation.messages} mensajes
                </small>
              </div>
            ))}
          </div>

          <div className="conv-foot">
            <span>{filtered.length} conversaciones</span>
            <span>Cuota mensual</span>
          </div>
        </section>

        <section className="card chat-panel">
          <div className="chat-subbar">
            <div className="rag-state">
              <span className="dot" />
              Base de conocimiento RAG
              <span className="workspace-badge">
                {quota ? `${quota.remaining.toLocaleString()} tokens` : 'indice activo'}
              </span>
            </div>
            <div className="subbar-actions">
              <button type="button" onClick={newConversation} title="Limpiar pantalla">
                <Icon name="trash" className="icon-sm" />
                Limpiar
              </button>
            </div>
          </div>

          <div className={`messages${messages.length === 0 ? ' empty-messages' : ''}`}>
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-emblem">
                  <Icon name="globe" />
                </div>
                <h3>A donde te gustaria viajar?</h3>
                <p>
                  Pregunta sobre destinos, hospedajes, presupuesto, clima o recomendaciones
                  personalizadas para tu proximo viaje.
                </p>

                <span className="suggestion-label">Sugerencias rapidas para comenzar</span>
                <div className="suggestion-grid">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.text}
                      className="suggestion-chip"
                      onClick={() => useSuggestion(suggestion.text)}
                    >
                      <span className="chip-emoji">{suggestion.emoji}</span>
                      <span>{suggestion.text}</span>
                    </button>
                  ))}
                </div>

                <span className="grounded-badge">
                  <Icon name="shield" />
                  RAG alimentado con destinos, actividades y normativas verificadas
                </span>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`msg ${message.role}`}>
                {message.role === 'assistant' ? (
                  <div className="md">
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>
                ) : (
                  message.content
                )}
                {message.sources?.length > 0 && (
                  <>
                    <div className="sources">
                      {message.sources.map((source, sourceIndex) => (
                        <span key={sourceIndex} className="source-pill">
                          {source.title} · similitud {source.score}
                        </span>
                      ))}
                    </div>
                    <details className="rag-details">
                      <summary>
                        Ver contexto recuperado ({message.sources.length}{' '}
                        {message.sources.length === 1 ? 'fragmento' : 'fragmentos'})
                      </summary>
                      <p className="rag-note">
                        Estos son los fragmentos de la base de datos que se enviaron al modelo como
                        contexto para responder.
                      </p>
                      {message.sources.map((source, sourceIndex) => (
                        <div className="rag-source" key={sourceIndex}>
                          <div className="rag-source-head">
                            <strong>
                              {sourceIndex + 1}. {source.title}
                            </strong>
                            <span className="badge">similitud {source.score}</span>
                          </div>
                          <p>{source.snippet}</p>
                          <small className="muted">
                            {source.source} · {source.category}
                          </small>
                        </div>
                      ))}
                    </details>
                  </>
                )}
                {message.tokens && (
                  <div className="meta">
                    {message.insufficient ? 'Sin informacion suficiente · ' : ''}
                    {message.tokens.used} tokens · quedan {message.tokens.remaining}
                  </div>
                )}
              </div>
            ))}
            {sending && <div className="typing">Consultando la base de conocimiento...</div>}
            <div ref={endRef} />
          </div>

          <div className="chat-composer">
            <form
              className="composer-box"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <textarea
                ref={inputRef}
                placeholder="Pregunta sobre destinos, actividades, clima, transporte o presupuesto..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <div className="composer-row">
                <span className="composer-hint">Shift + Enter para nueva linea</span>
                <button className="btn primary" disabled={sending || !input.trim()}>
                  {sending ? 'Consultando...' : 'Enviar'}
                  <Icon name="send" className="icon-sm" />
                </button>
              </div>
            </form>
            <p className="composer-disclaimer">
              Web IA puede cometer errores ocasionales. Verifica siempre precios y requisitos de
              reserva con fuentes oficiales.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
