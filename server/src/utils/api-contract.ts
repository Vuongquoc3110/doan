import { RequestHandler } from 'express';
import { z } from 'zod';
import { sendError } from './response';

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export function normalizeOrderStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const status = value.toUpperCase();
  return ({ PROCESSING: 'PREPARING', DELIVERING: 'SHIPPING' } as Record<string, string>)[status] || status;
}
export const statusFilter: RequestHandler = (req, res, next) => {
  const status = req.query.status;
  if (!status || status === 'all') return next();
  const parsed = z.enum(ORDER_STATUSES).safeParse(normalizeOrderStatus(status));
  if (!parsed.success) return sendError(res, 'Trạng thái đơn hàng không hợp lệ', 400);
  req.query.status = parsed.data;
  next();
};
export const positiveId = z.number().int().positive().max(2147483647);
export const posSchema = z.object({
  customerPhone: z.string().trim().min(9).optional(),
  paymentMethod: z.enum(['cod', 'vietqr', 'vnpay']).default('cod'),
  pointsToUse: z.number().int().min(0).default(0),
  cashReceived:z.number().int().nonnegative().safe().optional(),
  couponCode: z.string().optional(),
  items: z.array(z.object({ variantId: positiveId, qty: positiveId })).min(1),
});
export const normalizePos: RequestHandler = (req, _res, next) => {
  const b = req.body || {};
  const payment = b.paymentMethod ?? b.payment_method;
  req.body = { customerPhone: b.customerPhone ?? b.customer_phone,
    paymentMethod: payment === 'cash' ? 'cod' : payment,
    pointsToUse: b.pointsToUse ?? b.points_to_redeem,
    cashReceived:b.cashReceived,
    couponCode: b.couponCode ?? b.coupon_code,
    items: Array.isArray(b.items) ? b.items.map((i: any) => ({variantId: i?.variantId ?? i?.variant_id, qty: i?.qty ?? i?.quantity})) : b.items };
  next();
};
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'PREPARING', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'SHIPPING', 'CANCELLED'],
  PREPARING: ['READY', 'SHIPPING', 'CANCELLED'],
  READY: ['SHIPPING', 'COMPLETED', 'CANCELLED'],
  SHIPPING: ['COMPLETED'], COMPLETED: [], CANCELLED: [], RETURNED: [],
};
export function canTransition(from: OrderStatus, to: OrderStatus, deliveryType: string): boolean {
  if (from === to) return true;
  if (deliveryType === 'pickup' && to === 'SHIPPING') return false;
  if (deliveryType === 'pickup' && to === 'COMPLETED' && ['CONFIRMED', 'PREPARING', 'READY'].includes(from)) return true;
  return transitions[from]?.includes(to) ?? false;
}
