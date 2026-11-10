import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { runAgent } from '../services/agents.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  input: z.string().min(3).max(4000),
  conversationId: z.number().int().positive().nullable().optional(),
});

/**
 * @openapi
 * /api/agents/itinerary:
 *   post:
 *     tags: [Agents]
 *     summary: Agente planificador de itinerario (multi-paso con herramientas)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input: { type: string }
 *     responses:
 *       200: { description: Plan, pasos ejecutados y tokens }
 *       429: { description: Limite de tokens alcanzado }
 */
router.post(
  '/itinerary',
  asyncHandler(async (req, res) => {
    const { input, conversationId } = schema.parse(req.body);
    const result = await runAgent({
      user: req.user,
      agentKey: 'itinerary',
      input,
      conversationId: conversationId || null,
    });
    res.json(result);
  }),
);

/**
 * @openapi
 * /api/agents/adjust:
 *   post:
 *     tags: [Agents]
 *     summary: Agente que ajusta un viaje ante cambios de presupuesto o clima
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input: { type: string }
 *     responses:
 *       200: { description: Alternativas y presupuesto recalculado }
 *       429: { description: Limite de tokens alcanzado }
 */
router.post(
  '/adjust',
  asyncHandler(async (req, res) => {
    const { input, conversationId } = schema.parse(req.body);
    const result = await runAgent({
      user: req.user,
      agentKey: 'adjust',
      input,
      conversationId: conversationId || null,
    });
    res.json(result);
  }),
);

router.get(
  '/runs',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT r.id, r.input, r.steps, r.output, r.tokens, r.created_at,
              s.key AS service_key, s.name AS service_name
         FROM agent_runs r
         JOIN services s ON s.id = r.service_id
        WHERE r.user_id = $1
        ORDER BY r.id DESC
        LIMIT 50`,
      [req.user.id],
    );
    res.json({ runs: rows });
  }),
);

export default router;
