import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { indexAllDocuments, indexDocument } from '../services/rag.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  title: z.string().min(2).max(200),
  source: z.string().max(200).default('Base de datos interna'),
  category: z.string().max(80).default('general'),
  content: z.string().min(10),
  active: z.boolean().default(true),
});

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT d.id, d.title, d.source, d.category, d.active, d.created_at,
              (SELECT COUNT(*)::int FROM rag_chunks c WHERE c.document_id = d.id) AS chunks
         FROM rag_documents d
        ORDER BY d.id`,
    );
    res.json({ documents: rows });
  }),
);

router.get(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM rag_documents WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (!rows[0]) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');
    res.json({ document: rows[0] });
  }),
);

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO rag_documents (title, source, category, content, active)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, title, source, category, active, created_at`,
      [data.title, data.source, data.category, data.content, data.active],
    );

    let indexing = null;
    try {
      indexing = await indexDocument(rows[0].id);
    } catch (error) {
      indexing = { error: error.message };
    }

    res.status(201).json({ document: rows[0], indexing });
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `UPDATE rag_documents
          SET title=$1, source=$2, category=$3, content=$4, active=$5
        WHERE id=$6
        RETURNING id, title, source, category, active, created_at`,
      [data.title, data.source, data.category, data.content, data.active, Number(req.params.id)],
    );
    if (!rows[0]) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');

    let indexing = null;
    try {
      indexing = await indexDocument(rows[0].id);
    } catch (error) {
      indexing = { error: error.message };
    }
    res.json({ document: rows[0], indexing });
  }),
);

router.post(
  '/reindex',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const results = await indexAllDocuments();
    res.json({ indexed: results.length, results });
  }),
);

router.post(
  '/:id/reindex',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await indexDocument(Number(req.params.id));
    res.json({ indexing: result });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM rag_documents WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (!rowCount) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');
    res.json({ ok: true });
  }),
);

export default router;
