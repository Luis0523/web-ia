import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './docs/swagger.js';
import { errorHandler, notFound } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import servicesRoutes from './routes/services.js';
import destinosRoutes from './routes/destinos.js';
import actividadesRoutes from './routes/actividades.js';
import documentsRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';
import agentsRoutes from './routes/agents.js';
import usageRoutes from './routes/usage.js';
import biRoutes from './routes/bi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'web-ia', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/destinos', destinosRoutes);
  app.use('/api/actividades', actividadesRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/usage', usageRoutes);
  app.use('/api/bi', biRoutes);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Web IA API' }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

  app.use('/api', notFound);

  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
};
