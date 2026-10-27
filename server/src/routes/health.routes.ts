import { Router, Request, Response } from 'express';
import os from 'os';
import pool from '../db/connection';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbError: string | null = null;
  let stats = { products: 0, stores: 0, orders: 0 };

  try {
    const [rows] = await pool.query<any[]>('SELECT 1 as ok');
    if (rows && rows[0]?.ok === 1) {
      dbStatus = 'connected';
      const [pCount] = await pool.query<any[]>('SELECT COUNT(*) as c FROM products');
      const [sCount] = await pool.query<any[]>('SELECT COUNT(*) as c FROM stores');
      const [oCount] = await pool.query<any[]>('SELECT COUNT(*) as c FROM orders');
      stats = {
        products: pCount[0]?.c || 0,
        stores: sCount[0]?.c || 0,
        orders: oCount[0]?.c || 0,
      };
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err.message;
  }

  // Get local network IPs for convenient phone connection diagnosis
  const interfaces = os.networkInterfaces();
  const localIps: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address);
      }
    }
  }

  const responseTimeMs = Date.now() - startTime;

  if (dbStatus === 'connected') {
    return sendSuccess(res, {
      status: 'healthy',
      server: {
        name: 'Klever Fruit API Server',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        responseTimeMs,
        localIps,
      },
      database: {
        status: 'connected',
        name: process.env.DB_NAME || 'klever_fruits_db',
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        stats,
      },
      client: {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    }, 'Hệ thống Backend và Database hoạt động bình thường');
  } else {
    return sendError(res, `Không thể kết nối đến Database: ${dbError}`, 503, {
      status: 'unhealthy',
      database: {
        status: dbStatus,
        error: dbError,
      },
    });
  }
});

export default router;
