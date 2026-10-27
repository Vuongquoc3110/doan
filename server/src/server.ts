import paymentRoutes from './routes/payment.routes';
import posHardwareRoutes from './routes/pos-hardware.routes';
import operationsRoutes from './routes/operations.routes';
import logisticsRoutes from './routes/logistics.routes';
import { startOperationsWorker } from './services/operations-worker';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import os from 'os';

import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { swaggerDocument } from './docs/swagger';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import meRoutes from './routes/me.routes';
import staffRoutes from './routes/staff.routes';
import adminRoutes from './routes/admin.routes';
import backofficeRoutes from './routes/backoffice.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// 1. Basic security & middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' },
});
app.use('/api/', limiter);

// 3. Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 5. Routes
app.use('/api', healthRoutes); // GET /api/health
app.use('/api/v1', publicRoutes); // GET /api/v1/products, /api/v1/stores, /api/v1/categories
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/payments',paymentRoutes);
app.use('/api/v1/staff/pos',posHardwareRoutes);
app.use('/api/v1',operationsRoutes);
app.use('/api/v1',logisticsRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/admin', backofficeRoutes, adminRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Root greeting
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Klever Fruit API Server',
    status: 'running',
    health: '/api/health',
    docs: '/api/docs',
    version: '1.0.0',
  });
});

// Centralized error handler
app.use(errorHandler);

// 6. Start server
const server = app.listen(config.port, config.host, () => {
  const interfaces = os.networkInterfaces();
  const localIps: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address);
      }
    }
  }

  console.log('\n================================================================');
  console.log('🍇 KLEVER FRUIT REST API SERVER IS RUNNING 🍇');
  console.log('================================================================');
  console.log(`📡 Local URL:       http://localhost:${config.port}`);
  console.log(`🌐 Network host:    http://${config.host}:${config.port}`);
  for (const ip of localIps) {
    console.log(`📱 Phone Access:    http://${ip}:${config.port}/api`);
  }
  console.log(`🩺 Health Check:    http://localhost:${config.port}/api/health`);
  console.log(`📚 Swagger Docs:    http://localhost:${config.port}/api/docs`);
  console.log('================================================================\n');
});

export { app, server };
const stopOperationsWorker = startOperationsWorker();
server.on('close', stopOperationsWorker);
export default server;
