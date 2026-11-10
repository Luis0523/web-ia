import { Router } from 'express';
import { requireApiKey } from '../middleware/auth.js';
import { usageReport } from '../services/usage.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireApiKey);

/**
 * @openapi
 * /api/bi/usage:
 *   get:
 *     tags: [BI]
 *     summary: Reporte de consultas y consumo para Power BI
 *     description: Requiere la cabecera x-api-key. Filtros por fecha y servicio.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: service
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reporte agregado }
 *       401: { description: API key invalida }
 */
router.get(
  '/usage',
  asyncHandler(async (req, res) => {
    const report = await usageReport({
      from: req.query.from || null,
      to: req.query.to || null,
      service: req.query.service || null,
    });
    res.json(report);
  }),
);

export default router;
