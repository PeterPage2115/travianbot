import express from 'express';
import ejsLayouts from 'express-ejs-layouts';
import { getDashboardStats, getCommandLogs, getErrorLogs, getCommandStatsByDay } from './metrics.js';
import { logger } from '../logger.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function renderWithLayout(res: express.Response, view: string, locals: Record<string, unknown>): void {
  const path = view === 'dashboard' ? '/' : `/${view}`;
  res.render(view, { ...locals, path });
}

function checkAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!ADMIN_PASSWORD) {
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic');
    res.status(401).send('Authentication required');
    return;
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  const [, password] = credentials.split(':');
  if (password !== ADMIN_PASSWORD) {
    res.status(401).send('Invalid credentials');
    return;
  }

  next();
}

export function createAdminServer(port: number): express.Application {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', './src/admin/views');
  app.use(ejsLayouts);

  app.use(express.static('src/admin/public'));
  app.use(checkAuth);

  app.get('/', (_req, res) => {
    const stats = getDashboardStats();
    const chartData = getCommandStatsByDay(7);
    renderWithLayout(res, 'dashboard', { stats, chartData });
  });

  app.get('/commands', (_req, res) => {
    const logs = getCommandLogs(200);
    renderWithLayout(res, 'commands', { logs });
  });

  app.get('/errors', (_req, res) => {
    const logs = getErrorLogs(200);
    renderWithLayout(res, 'errors', { logs });
  });

  app.get('/api/stats', (_req, res) => {
    res.json(getDashboardStats());
  });

  app.get('/api/commands', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(getCommandLogs(limit, offset));
  });

  app.get('/api/errors', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(getErrorLogs(limit, offset));
  });

  app.get('/api/chart', (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    res.json(getCommandStatsByDay(days));
  });

  app.listen(port, () => {
    logger.info({ port }, 'Admin panel started');
  });

  return app;
}
