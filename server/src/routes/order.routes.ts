import { requirePaymentConfig, paymentData } from '../services/payment';
import { consumeBatches, recordAllocations, restoreBatches, Allocation } from '../services/batches';
import { enqueueOrderEvents } from '../services/operation-events';
import { statusFilter } from '../utils/api-contract';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/connection';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// 1. CHECKOUT ORDER WITH STRICT TRANSACTION & INVENTORY LOCKING
const checkoutSchema = z.object({
  storeId: z.number().int().positive('Vui lòng chọn cửa hàng'),
  receiverName: z.string().min(2, 'Tên người nhận tối thiểu 2 ký tự'),
  receiverPhone: z.string().min(9, 'Số điện thoại người nhận không hợp lệ'),
  receiverAddress: z.string().min(5, 'Địa chỉ nhận hàng chi tiết'),
  receiverDistrict: z.string().optional(),
  receiverCity: z.string().optional(),
  deliveryType: z.enum(['ship', 'pickup']).default('ship'),
  deliveryDate: z.string().min(8, 'Vui lòng chọn ngày giao hàng'),
  deliverySlot: z.string().min(2, 'Vui lòng chọn khung giờ giao hàng'),
  greetingMessage: z.string().optional(),
  ribbonColor: z.string().default('Ruy-băng Tím Klever'),
  couponCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  pointsToUse: z.number().int().min(0).default(0),
  paymentMethod: z.enum(['cod', 'vietqr', 'vnpay']).default('cod'),
  deliveryQuoteId: z.string().uuid().optional(),
  vatRequest: z.any().optional(),
  items: z.array(
    z.object({
      variantId: z.number().int().positive(),
      qty: z.number().int().positive(),
    })
  ).min(1, 'Giỏ hàng không được để trống'),
});

const normalizeCheckoutBody = (req: Request, _res: Response, next: any) => {
  const b = req.body || {};
  req.body = {
    storeId: b.storeId ?? b.store_id,
    receiverName: b.receiverName ?? b.recipient_name ?? b.receiver_name,
    receiverPhone: b.receiverPhone ?? b.recipient_phone ?? b.receiver_phone,
    receiverAddress: b.receiverAddress ?? b.shipping_address ?? b.receiver_address,
    receiverDistrict: b.receiverDistrict ?? b.receiver_district,
    receiverCity: b.receiverCity ?? b.receiver_city,
    deliveryType:
      b.deliveryType === 'delivery' || b.delivery_type === 'delivery'
        ? 'ship'
        : b.deliveryType ?? b.delivery_type ?? 'ship',
    deliveryDate: b.deliveryDate ?? b.delivery_date ?? new Date().toISOString().split('T')[0],
    deliverySlot: b.deliverySlot ?? b.delivery_time_slot ?? b.delivery_slot ?? '14:00 - 17:00',
    greetingMessage: b.greetingMessage ?? b.gift_note ?? b.greeting_message,
    ribbonColor: b.ribbonColor ?? b.ribbon_color ?? 'Ruy-băng Tím Klever',
    couponCode: b.couponCode ?? b.coupon_code,
    giftCardCode: b.giftCardCode ?? b.gift_card_code,
    pointsToUse: b.pointsToUse ?? b.points_to_redeem ?? 0,
    paymentMethod: b.paymentMethod ?? b.payment_method ?? 'cod',
    deliveryQuoteId: b.deliveryQuoteId,
    vatRequest: b.vatRequest ?? b.vat_request,
    items: (Array.isArray(b.items) ? b.items : []).map((i: any) => ({
      variantId: i?.variantId ?? i?.variant_id,
      qty: i?.qty ?? i?.quantity,
    })),
  };
  next();
};

router.post(['/', '/checkout'], optionalAuth, normalizeCheckoutBody, validate(checkoutSchema), async (req: Request, res: Response) => {
  const userId = req.user?.userId || null;
  const {
    storeId,
    receiverName,
    receiverPhone,
    receiverAddress,
    receiverDistrict,
    receiverCity,
    deliveryType,
    deliveryDate,
    deliverySlot,
    greetingMessage,
    ribbonColor,
    couponCode,
    giftCardCode,
    pointsToUse,
    paymentMethod,
    vatRequest,
    items,
  } = req.body;

  try { requirePaymentConfig(paymentMethod); } catch(e:any) { return sendError(res,e.message,503); }
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const allocations:Allocation[]=[];
    // 1. Verify store exists
    const [stores] = await conn.query<any[]>('SELECT id, name, ship_fee_rules FROM stores WHERE id = ? AND is_active = 1', [storeId]);
    if (stores.length === 0) {
      await conn.rollback();
      return sendError(res, 'Cửa hàng không tồn tại', 404);
    }

    // 2. Lock & verify inventory for each variant
    let subtotal = 0;
    const validatedItems: Array<{
      variantId: number;
      productName: string;
      variantLabel: string;
      unitPrice: number;
      qty: number;
      totalPrice: number;
    }> = [];

    for (const item of items) {
      // Lock variant row
      const [variantRows] = await conn.query<any[]>(
        `SELECT pv.id, pv.price, pv.label, p.name as product_name
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.id = ?`,
        [item.variantId]
      );

      if (variantRows.length === 0) {
        await conn.rollback();
        return sendError(res, `Biến thể sản phẩm #${item.variantId} không tồn tại`, 400);
      }

      const variant = variantRows[0];

      // Lock inventory row for this store & variant
      const [invRows] = await conn.query<any[]>(
        'SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ? FOR UPDATE',
        [storeId, item.variantId]
      );

      const currentStock = invRows.length > 0 ? invRows[0].qty : 0;
      if (currentStock < item.qty) {
        await conn.rollback();
        return sendError(
          res,
          `Sản phẩm "${variant.product_name} - ${variant.label}" không đủ số lượng tại chi nhánh (còn ${currentStock}, yêu cầu ${item.qty})`,
          400
        );
      }

      // Deduct inventory
      allocations.push(...await consumeBatches(conn,storeId,item.variantId,item.qty));
      await conn.query(
        'UPDATE inventory SET qty = qty - ? WHERE store_id = ? AND variant_id = ?',
        [item.qty, storeId, item.variantId]
      );

      const lineTotal = Number(variant.price) * item.qty;
      subtotal += lineTotal;

      validatedItems.push({
        variantId: variant.id,
        productName: variant.product_name,
        variantLabel: variant.label,
        unitPrice: Number(variant.price),
        qty: item.qty,
        totalPrice: lineTotal,
      });
    }

    // Server-side, short-lived provider quotes prevent client fee manipulation.
    let deliveryQuote:any;
    let shipFee = 0;
    if (deliveryType === 'ship') {
      if(process.env.AHAMOVE_ENABLED==='true') {
        const [quotes]=await conn.query<any[]>('SELECT * FROM delivery_quotes WHERE id=? AND store_id=? AND address=? AND expires_at>NOW()',[req.body.deliveryQuoteId||'',storeId,receiverAddress]);
        if(!quotes.length) {await conn.rollback();return sendError(res,'Cần lấy lại báo giá cho địa chỉ và chi nhánh đã chọn',409);}
        deliveryQuote=quotes[0];shipFee=Number(deliveryQuote.fee);
      }else{
        const rules=typeof stores[0].ship_fee_rules==='string'?JSON.parse(stores[0].ship_fee_rules):stores[0].ship_fee_rules||{};
        shipFee=subtotal>=Number(rules.freeShipMin||500000)?0:Number(rules.baseFee||25000);
      }
    }

    // 4. Coupon Discount
    let discount = 0;
    if (couponCode && couponCode.trim()) {
      const [cRows] = await conn.query<any[]>(
        'SELECT * FROM coupons WHERE code = ? AND expires_at > NOW() AND used < max_uses FOR UPDATE',
        [couponCode.trim().toUpperCase()]
      );
      if (cRows.length > 0) {
        const c = cRows[0];
        if (subtotal >= c.min_order) {
          const cDiscount = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
          discount += cDiscount;
          await conn.query('UPDATE coupons SET used = used + 1 WHERE id = ?', [c.id]);
        }
      }
    }

    // 5. Gift Card
    if (giftCardCode && giftCardCode.trim()) {
      const [gcRows] = await conn.query<any[]>(
        "SELECT * FROM gift_cards WHERE code = ? AND status = 'active' AND expires_at > NOW() AND balance > 0 FOR UPDATE",
        [giftCardCode.trim().toUpperCase()]
      );
      if (gcRows.length > 0) {
        const gc = gcRows[0];
        const canUse = Math.min(Number(gc.balance), Math.max(0, subtotal + shipFee - discount));
        discount += canUse;
        const newBalance = Number(gc.balance) - canUse;
        await conn.query(
          'UPDATE gift_cards SET balance = ?, status = ? WHERE id = ?',
          [newBalance, newBalance <= 0 ? 'used' : 'active', gc.id]
        );
      }
    }

    // 6. Loyalty Points (1 point = 1.000 VNĐ)
    if (userId && pointsToUse > 0) {
      const [cProfile] = await conn.query<any[]>(
        'SELECT points FROM customer_profiles WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      const userPoints = cProfile.length > 0 ? cProfile[0].points : 0;
      const actualPoints = Math.min(userPoints, pointsToUse);
      const pointsDiscount = actualPoints * 1000;
      discount += pointsDiscount;

      if (actualPoints > 0) {
        await conn.query('UPDATE customer_profiles SET points = points - ? WHERE user_id = ?', [
          actualPoints,
          userId,
        ]);
        await conn.query(
          'INSERT INTO loyalty_transactions (user_id, points, type, description) VALUES (?, ?, ?, ?)',
          [userId, actualPoints, 'redeem', `Trừ ${actualPoints} điểm khi thanh toán đơn hàng`]
        );
      }
    }

    const total = Math.max(0, subtotal + shipFee - discount);
    const orderCode = `KF26${Date.now().toString().slice(-6)}`;

    // 7. Insert Order
    const [orderRes]: any = await conn.query(
      `INSERT INTO orders (
        code, user_id, store_id, receiver_name, receiver_phone,
        receiver_address, receiver_district, receiver_city,
        delivery_type, delivery_date, delivery_slot,
        greeting_message, ribbon_color, subtotal, ship_fee,
        discount, total, payment_method, payment_status,
        status, vat_request
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        userId,
        storeId,
        receiverName,
        receiverPhone,
        receiverAddress,
        receiverDistrict || null,
        receiverCity || 'Hà Nội',
        deliveryType,
        deliveryDate,
        deliverySlot,
        greetingMessage || null,
        ribbonColor,
        subtotal,
        shipFee,
        discount,
        total,
        paymentMethod,
        paymentMethod === 'cod' ? 'unpaid' : 'unpaid',
        'PENDING',
        vatRequest ? JSON.stringify(vatRequest) : null,
      ]
    );

    const orderId = orderRes.insertId;
    await recordAllocations(conn,orderId,allocations);
    if(deliveryQuote)await conn.execute('INSERT INTO order_deliveries (order_id,quote_id,lat,lng,address) VALUES (?,?,?,?,?)',[orderId,deliveryQuote.id,deliveryQuote.lat,deliveryQuote.lng,deliveryQuote.address]);

    // 8. Insert Order Items
    for (const it of validatedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, variant_id, product_name, variant_label, unit_price, qty, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, it.variantId, it.productName, it.variantLabel, it.unitPrice, it.qty, it.totalPrice]
      );
    }

    // 9. Insert Initial Order Status History
    await conn.query(
      'INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, ?, ?, ?)',
      [orderId, 'PENDING', 'Đơn hàng được khởi tạo thành công trên hệ thống', userId]
    );

    // Commit Transaction
    await enqueueOrderEvents(conn,{id:orderId,code:orderCode,user_id:userId,receiver_phone:receiverPhone,status:'PENDING',delivery_type:deliveryType},'created:'+orderId);
    await conn.commit();

    const paymentDataResult = paymentData(paymentMethod,orderCode,total,req.ip);

    return sendSuccess(
      res,
      {
        orderId,
        orderCode,
        subtotal,
        shipFee,
        discount,
        total,
        paymentMethod,
        paymentData: paymentDataResult,
      },
      'Đặt hàng thành công! Klever Fruit trân trọng cảm ơn quý khách.',
      201
    );
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, `Lỗi đặt hàng: ${err.message}`, err.status || 500);
  } finally {
    conn.release();
  }
});

// 2. MY ORDERS
router.get(['/', '/my-orders'], authenticate, statusFilter, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const status = req.query.status as string;

  try {
    const conditions = ['o.user_id = ?'];
    const params: any[] = [userId];

    if (status && status !== 'all') {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const [orders] = await pool.query<any[]>(
      `SELECT o.*, s.name as store_name, s.phone as store_phone
       FROM orders o
       LEFT JOIN stores s ON o.store_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.id DESC`,
      params
    );

    for (const order of orders) {
      const [items] = await pool.query<any[]>(
        `SELECT oi.*, (SELECT product_id FROM product_variants WHERE id=oi.variant_id) as product_id,
          (SELECT url FROM product_images pi
           JOIN product_variants pv ON pi.product_id = pv.product_id
           WHERE pv.id = oi.variant_id LIMIT 1) as thumbnail
         FROM order_items oi WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return sendSuccess(res, orders);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 3. ORDER DETAIL BY ID OR CODE
router.get('/:idOrCode', optionalAuth, async (req: Request, res: Response) => {
  const { idOrCode } = req.params;
  const isNumeric = /^\d+$/.test(idOrCode);

  try {
    const [orders] = await pool.query<any[]>(
      `SELECT o.*, s.name as store_name, s.address as store_address, s.phone as store_phone
       FROM orders o
       LEFT JOIN stores s ON o.store_id = s.id
       WHERE ${isNumeric ? 'o.id = ?' : 'o.code = ?'}`,
      [isNumeric ? parseInt(idOrCode) : idOrCode]
    );

    if (orders.length === 0) {
      return sendError(res, 'Đơn hàng không tồn tại', 404);
    }

    const order = orders[0];

    // Fetch Items
    const [items] = await pool.query<any[]>(
      `SELECT oi.*, (SELECT product_id FROM product_variants WHERE id=oi.variant_id) as product_id,
        (SELECT url FROM product_images pi
         JOIN product_variants pv ON pi.product_id = pv.product_id
         WHERE pv.id = oi.variant_id LIMIT 1) as thumbnail
       FROM order_items oi WHERE oi.order_id = ?`,
      [order.id]
    );

    // Fetch Timeline
    const [history] = await pool.query<any[]>(
      `SELECT osh.*, u.full_name as by_user_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.by_user_id = u.id
       WHERE osh.order_id = ?
       ORDER BY osh.created_at ASC`,
      [order.id]
    );

    // Fetch Return Request if any
    const [returns] = await pool.query<any[]>(
      'SELECT * FROM return_requests WHERE order_id = ? ORDER BY id DESC LIMIT 1',
      [order.id]
    );

    // Check 48h return policy
    let canReturn = false;
    if (order.status === 'COMPLETED') {
      const completedHistory = history.find((h: any) => h.status === 'COMPLETED');
      const completedTime = completedHistory ? new Date(completedHistory.created_at).getTime() : new Date(order.created_at).getTime();
      const hoursSinceCompleted = (Date.now() - completedTime) / (1000 * 60 * 60);
      canReturn = hoursSinceCompleted <= 48 && returns.length === 0;
    }

    return sendSuccess(res, {
      ...order,
      items,
      history,
      returnRequest: returns[0] || null,
      canReturn,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 4. CANCEL ORDER (Customer or Staff)
router.post('/:id/cancel', optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const reason = req.body.reason || 'Khách hàng yêu cầu hủy đơn';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query<any[]>('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await conn.rollback();
      return sendError(res, 'Đơn hàng không tồn tại', 404);
    }

    const order = orders[0];
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      await conn.rollback();
      return sendError(res, 'Chỉ có thể hủy đơn hàng khi ở trạng thái Chờ xử lý hoặc Đã xác nhận', 400);
    }

    await restoreBatches(conn,Number(id),order.store_id);
    // Return stock to inventory
    const [items] = await conn.query<any[]>('SELECT variant_id, qty FROM order_items WHERE order_id = ?', [id]);
    for (const it of items) {
      await conn.query(
        'UPDATE inventory SET qty = qty + ? WHERE store_id = ? AND variant_id = ?',
        [it.qty, order.store_id, it.variant_id]
      );
    }

    // Update order status
    await conn.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [id]);

    // Insert history
    await conn.query(
      'INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, ?, ?, ?)',
      [id, 'CANCELLED', reason, req.user?.userId || null]
    );

    await conn.commit();
    return sendSuccess(res, null, 'Hủy đơn hàng thành công');
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, 500);
  } finally {
    conn.release();
  }
});

// 5. RETURN REQUEST (ONLY WITHIN 48H OF COMPLETED)
router.post(['/:id/return-request', '/:id/return'], optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, images } = req.body;

  if (!reason || !reason.trim()) {
    return sendError(res, 'Vui lòng cung cấp lý do đổi trả', 400);
  }

  try {
    const [orders] = await pool.query<any[]>('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) return sendError(res, 'Đơn hàng không tồn tại', 404);

    const order = orders[0];
    if (order.status !== 'COMPLETED') {
      return sendError(res, 'Chỉ có thể yêu cầu đổi trả cho đơn hàng đã hoàn tất giao hàng', 400);
    }

    // Check 48h limit
    const [completedHistory] = await pool.query<any[]>(
      "SELECT created_at FROM order_status_history WHERE order_id = ? AND status = 'COMPLETED' ORDER BY id DESC LIMIT 1",
      [id]
    );
    const completedTime = completedHistory.length > 0 ? new Date(completedHistory[0].created_at).getTime() : new Date(order.created_at).getTime();
    const hoursSince = (Date.now() - completedTime) / (1000 * 60 * 60);

    if (hoursSince > 48) {
      return sendError(res, 'Đã quá thời hạn 48 giờ để yêu cầu đổi trả theo chính sách của Klever Fruit', 400);
    }

    // Check existing return request
    const [existing] = await pool.query<any[]>('SELECT id FROM return_requests WHERE order_id = ?', [id]);
    if (existing.length > 0) {
      return sendError(res, 'Đơn hàng này đã có yêu cầu đổi trả đang được xử lý', 400);
    }

    await pool.query(
      'INSERT INTO return_requests (order_id, reason, images, status) VALUES (?, ?, ?, ?)',
      [id, reason, images ? JSON.stringify(images) : null, 'pending']
    );

    return sendSuccess(res, null, 'Gửi yêu cầu đổi trả thành công! Nhân viên chăm sóc khách hàng sẽ xử lý trong 2h', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

export default router;
