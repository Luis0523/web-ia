import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { getQuota, usageReport, userHistory } from '../services/usage.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

/**
 * @openapi
 * /api/usage/me:
 *   get:
 *     tags: [Usage]
 *     summary: Consumo de tokens del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Cuota y reporte por servicio }
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const quota = await getQuota(req.user.id);
    const report = await usageReport({
      userId: req.user.id,
      from: req.query.from || null,
      to: req.query.to || null,
      service: req.query.service || null,
    });
    res.json({ quota, report });
  }),
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const history = await userHistory(req.user.id, {
      from: req.query.from || null,
      to: req.query.to || null,
    });
    res.json({ history });
  }),
);

router.get(
  '/admin/usage',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const report = await usageReport({
      userId: req.query.userId ? Number(req.query.userId) : null,
      from: req.query.from || null,
      to: req.query.to || null,
      service: req.query.service || null,
    });
    res.json({ report });
  }),
);

router.get(
  '/admin/summary',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const report = await usageReport({
      userId: req.query.userId ? Number(req.query.userId) : null,
      from: req.query.from || null,
      to: req.query.to || null,
      service: req.query.service || null,
    });
    res.json({
      range: report.range,
      totals: report.totals,
      byService: report.byService,
      byUser: report.byUser,
    });
  }),
);

export default router;
