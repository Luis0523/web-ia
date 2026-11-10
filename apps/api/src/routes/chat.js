import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { getActiveService } from '../services/catalog.js';
import { handleChat } from '../services/chat.js';
import { userHistory } from '../services/usage.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().int().positive().nullable().optional(),
});

/**
 * @openapi
 * /api/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Chatbot con RAG y memoria conversacional
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *               conversationId: { type: integer, nullable: true }
 *     responses:
 *       200: { description: Respuesta con fuentes y consumo de tokens }
 *       429: { description: Limite de tokens alcanzado }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { message, conversationId } = chatSchema.parse(req.body);
    const service = await getActiveService('rag_chat');
    const result = await handleChat({
      user: req.user,
      service,
      message,
      conversationId: conversationId || null,
    });
    res.json(result);
  }),
);

router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await userHistory(req.user.id, {
      from: req.query.from || null,
      to: req.query.to || null,
    });
    res.json({ conversations });
  }),
);

router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rows: conversations } = await query(
      `SELECT c.id, c.title, c.created_at, c.updated_at, s.key AS service_key, s.name AS service_name
         FROM conversations c
         JOIN services s ON s.id = c.service_id
        WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.user.id],
    );
    if (!conversations[0]) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversacion no encontrada');
    }
    const { rows: messages } = await query(
      'SELECT id, role, content, tokens, created_at FROM messages WHERE conversation_id = $1 ORDER BY id',
      [id],
    );
    res.json({ conversation: conversations[0], messages });
  }),
);

router.delete(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [
      Number(req.params.id),
      req.user.id,
    ]);
    if (!rowCount) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversacion no encontrada');
    res.json({ ok: true });
  }),
);

export default router;
