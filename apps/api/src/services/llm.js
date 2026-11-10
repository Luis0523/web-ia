import { env } from '../config/env.js';
import { AppError, estimateTokens } from '../utils/http.js';

const mockCompletion = ({ messages, tools }) => {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const prompt = lastUser?.content || '';
  const text = tools?.length
    ? 'Estoy en modo de demostracion sin proveedor de IA configurado. No puedo ejecutar herramientas reales, pero puedo describir el plan solicitado.'
    : `Respuesta de demostracion (sin GROQ_API_KEY configurada). Recibi: "${prompt.slice(0, 160)}".`;
  return {
    content: text,
    toolCalls: [],
    usage: {
      prompt_tokens: estimateTokens(JSON.stringify(messages)),
      completion_tokens: estimateTokens(text),
      total_tokens: estimateTokens(JSON.stringify(messages)) + estimateTokens(text),
    },
  };
};

export const chatCompletion = async ({
  messages,
  tools,
  model,
  temperature = 0.2,
  toolChoice,
}) => {
  if (env.mockAi || !env.groqApiKey) return mockCompletion({ messages, tools });

  const body = {
    model: model || env.groqModel,
    messages,
    temperature,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = toolChoice || 'auto';
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AppError(502, 'LLM_ERROR', `Groq respondio ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message || {};

  return {
    content: choice.content || '',
    toolCalls: choice.tool_calls || [],
    usage: data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
};
