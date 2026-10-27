import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('💥 Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi hệ thống máy chủ nội bộ';
  return sendError(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
