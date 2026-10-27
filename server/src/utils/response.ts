import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  pagination?: PaginationMeta;
}

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = 'Thành công',
  statusCode: number = 200,
  pagination?: PaginationMeta
) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    message,
    ...(pagination ? { pagination } : {}),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string = 'Đã có lỗi xảy ra',
  statusCode: number = 400,
  data: any = null
) {
  const payload: ApiResponse<any> = {
    success: false,
    data,
    message,
  };
  return res.status(statusCode).json(payload);
}
