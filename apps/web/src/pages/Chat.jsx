import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client.js';

const suggestions = [
  'Que destinos recomiendas para un viaje cultural con presupuesto medio?',
  'Cual es la mejor temporada para visitar Cusco?',
  'Que actividades hay en Cartagena y cuanto cuestan?',
];

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState(null);
  const endRef = useRef(null);

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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Chatbot con RAG</h1>
          <p>Respuestas basadas en los destinos y documentos registrados en la base de datos.</p>
        </div>
        {quota && (
          <div className="card" style={{ padding: '10px 16px' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Tokens restantes
            </span>
            <div style={{ fontWeight: 700 }}>{quota.remaining.toLocaleString()}</div>
          </div>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="chat-layout">
        <div className="card">
          <div className="split" style={{ marginBottom: 10 }}>
            <strong>Conversaciones</strong>
            <button className="btn small primary" onClick={newConversation}>
              Nueva
            </button>
          </div>
          <div className="conv-list">
            {conversations.length === 0 && <div className="empty">Sin conversaciones.</div>}
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conv-item${activeId === conversation.id ? ' active' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                {conversation.title}
                <small>
                  {conversation.service.name} · {conversation.messages} mensajes
                </small>
              </div>
            ))}
          </div>
        </div>

        <div className="card chat-panel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty">
                <p>Escribe una pregunta para comenzar. Ejemplos:</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="btn small ghost"
                      onClick={() => send(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
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
                  <div className="sources">
                    {message.sources.map((source, sourceIndex) => (
                      <span key={sourceIndex} className="source-pill">
                        {source.title} ({source.score})
                      </span>
                    ))}
                  </div>
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

          <form
            className="chat-input"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              className="textarea"
              placeholder="Pregunta sobre destinos, actividades, clima o presupuesto..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn primary" disabled={sending || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
