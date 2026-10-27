import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const firstError = err.errors[0]?.message || 'Dữ liệu đầu vào không hợp lệ';
        return sendError(res, firstError, 422, err.errors);
      }
      return sendError(res, 'Lỗi kiểm tra dữ liệu đầu vào', 400);
    }
  };
}
