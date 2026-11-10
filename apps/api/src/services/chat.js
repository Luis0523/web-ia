import { query } from '../db/pool.js';
import { AppError, estimateTokens } from '../utils/http.js';
import { buildContext, retrieve } from './rag.js';
import { chatCompletion } from './llm.js';
import { assertQuota, getQuota, recordUsage } from './usage.js';

const getRecentMessages = async (conversationId, limit = 6) => {
  const { rows } = await query(
    'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT $2',
    [conversationId, limit],
  );
  return rows.reverse().map((row) => ({ role: row.role, content: row.content }));
};

export const handleChat = async ({ user, service, message, conversationId }) => {
  await assertQuota(user.id, service.id);

  let conversationKey = conversationId;
  if (conversationKey) {
    const { rows } = await query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationKey, user.id],
    );
    if (!rows[0]) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversacion no encontrada');
    }
  } else {
    const { rows } = await query(
      'INSERT INTO conversations (user_id, service_id, title) VALUES ($1, $2, $3) RETURNING id',
      [user.id, service.id, message.slice(0, 80) || 'Nueva conversacion'],
    );
    conversationKey = rows[0].id;
  }

  const chunks = await retrieve(message);
  const sources = chunks.map((chunk) => ({
    title: chunk.title,
    source: chunk.source,
    category: chunk.category,
    score: Number(chunk.score.toFixed(3)),
  }));

  let answer;
  let tokensIn = estimateTokens(message);
  let tokensOut = 0;

  if (chunks.length === 0) {
    answer =
      'No cuento con informacion suficiente en la base de datos para responder esa consulta. ' +
      'Puedo ayudarte con destinos, actividades, clima, presupuestos y recomendaciones registradas. ' +
      'Intenta reformular la pregunta indicando un destino o tipo de viaje.';
    tokensOut = estimateTokens(answer);
  } else {
    const history = await getRecentMessages(conversationKey);
    const messages = [
      {
        role: 'system',
        content: `${service.system_prompt}\n\nContexto recuperado de la base de datos:\n${buildContext(chunks)}`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    const completion = await chatCompletion({ messages, model: service.model });
    answer = completion.content || 'No fue posible generar una respuesta en este momento.';
    tokensIn += completion.usage?.prompt_tokens || 0;
    tokensOut = completion.usage?.completion_tokens || estimateTokens(answer);
  }

  await query(
    "INSERT INTO messages (conversation_id, role, content, tokens) VALUES ($1, 'user', $2, $3)",
    [conversationKey, message, estimateTokens(message)],
  );
  await query(
    "INSERT INTO messages (conversation_id, role, content, tokens) VALUES ($1, 'assistant', $2, $3)",
    [conversationKey, answer, tokensOut],
  );
  await query('UPDATE conversations SET updated_at = now() WHERE id = $1', [conversationKey]);

  await recordUsage({
    userId: user.id,
    serviceId: service.id,
    endpoint: '/api/chat',
    kind: 'chat',
    tokensIn,
    tokensOut,
  });

  const quota = await getQuota(user.id, service.id);

  return {
    conversationId: conversationKey,
    answer,
    sources,
    insufficient: chunks.length === 0,
    tokens: {
      used: tokensIn + tokensOut,
      limit: quota.limit,
      totalUsed: quota.used,
      remaining: quota.remaining,
    },
  };
};
