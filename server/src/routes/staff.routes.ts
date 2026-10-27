import { randomBytes, createHash } from 'crypto';
import { requirePaymentConfig, paymentData } from '../services/payment';
import { consumeBatches, recordAllocations, restoreBatches, Allocation } from '../services/batches';
import { enqueueOrderEvents } from '../services/operation-events';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { normalizePos, posSchema, statusFilter, normalizeOrderStatus, ORDER_STATUSES, canTransition, OrderStatus } from '../utils/api-contract';
import { decideReturn } from '../utils/return-decision';
import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole, attachStaffStore } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireRole('staff', 'admin'));
router.use(attachStaffStore);

// Helper to get staff store id (admin can pass ?store_id= or defaults to 1)
function getTargetStoreId(req: Request): number {
  if (req.user?.role === 'admin' && req.query.store_id) {
    return parseInt(req.query.store_id as string);
  }
  return req.user?.storeId || 1;
}

// 1. SHIFT OVERVIEW (TỔNG QUAN CA LÀM)
router.get('/shift-overview', async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);

  try {
    const [pendingCount] = await pool.query<any[]>(
      "SELECT COUNT(*) as c FROM orders WHERE store_id = ? AND status = 'PENDING'",
      [storeId]
    );

    const [processingCount] = await pool.query<any[]>(
      "SELECT COUNT(*) as c FROM orders WHERE store_id = ? AND status IN ('CONFIRMED', 'PREPARING', 'READY', 'SHIPPING')",
      [storeId]
    );

    const [todayCompleted] = await pool.query<any[]>(
      "SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as revenue FROM orders WHERE store_id = ? AND status = 'COMPLETED' AND DATE(created_at) = CURDATE()",
      [storeId]
    );

    const [deliveringToday] = await pool.query<any[]>(
      "SELECT COUNT(*) as c FROM orders WHERE store_id = ? AND delivery_date = CURDATE() AND status NOT IN ('COMPLETED', 'CANCELLED', 'RETURNED')",
      [storeId]
    );

    const [pendingReturns] = await pool.query<any[]>('SELECT COUNT(*) as c FROM return_requests rr JOIN orders o ON o.id = rr.order_id WHERE o.store_id = ? AND rr.status = "pending"', [storeId]);
    const [storeInfo] = await pool.query<any[]>('SELECT id, name, address, phone FROM stores WHERE id = ?', [storeId]);

    return sendSuccess(res, {
      store: storeInfo[0],
      pendingReturns: pendingReturns[0]?.c || 0,
      pendingOrders: pendingCount[0]?.c || 0,
      processingOrders: processingCount[0]?.c || 0,
      deliveringToday: deliveringToday[0]?.c || 0,
      todayCompletedOrders: todayCompleted[0]?.c || 0,
      todayRevenue: todayCompleted[0]?.revenue || 0,
    });
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// 2. STORE ORDERS LIST
router.get('/orders', statusFilter, async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);
  const status = req.query.status as string;

  try {
    const conditions = ['o.store_id = ?'];
    const params: any[] = [storeId];

    if (status && status !== 'all') {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const [orders] = await pool.query<any[]>(
      `SELECT o.*, u.phone as customer_phone_registered
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.id DESC`,
      params
    );

    for (const o of orders) {
      const [items] = await pool.query<any[]>('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      o.items = items;
    }

    return sendSuccess(res, orders);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// 3. UPDATE ORDER STATUS (PENDING -> CONFIRMED -> PREPARING -> READY -> SHIPPING -> COMPLETED | CANCELLED)
router.put('/orders/:id/status', async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);
  const { id } = req.params;
  const { note, cancelReason } = req.body;
  const status = normalizeOrderStatus(req.body.status) as OrderStatus;

  const validStatuses = ORDER_STATUSES;
  if (!validStatuses.includes(status)) {
    return sendError(res, 'Trạng thái đơn hàng không hợp lệ', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query<any[]>('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await conn.rollback();
      return sendError(res, 'Đơn hàng không tồn tại', 404);
    }

    const order = orders[0];
    if (req.user?.role !== 'admin' && order.store_id !== storeId) {
      await conn.rollback();
      return sendError(res, 'Bạn chỉ được cập nhật đơn hàng thuộc chi nhánh của mình', 403);
    }

    if (!canTransition(order.status, status, order.delivery_type)) {
      await conn.rollback();
      return sendError(res, 'Không thể chuyển trạng thái đơn hàng này', 409);
    }
    if (order.status === status) {
      await conn.rollback();
      return sendSuccess(res, null, 'Đơn hàng đã ở trạng thái yêu cầu');
    }

    if (status === 'COMPLETED' && order.payment_method !== 'cod' && order.payment_status !== 'paid') {
      await conn.rollback(); return sendError(res, 'Payment has not been confirmed by provider', 409);
    }
    // Handle inventory return on cancel
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await restoreBatches(conn, Number(id), order.store_id);
      const [items] = await conn.query<any[]>('SELECT variant_id, qty FROM order_items WHERE order_id = ?', [id]);
      for (const it of items) {
        await conn.query('UPDATE inventory SET qty = qty + ? WHERE store_id = ? AND variant_id = ?', [
          it.qty,
          order.store_id,
          it.variant_id,
        ]);
      }
    }

    // Award loyalty points on COMPLETED (5% of total or 1 point per 20.000₫)
    if (status === 'COMPLETED' && order.status !== 'COMPLETED' && order.user_id) {
      const earnedPoints = Math.floor(order.total * 0.05 / 1000);
      if (earnedPoints > 0) {
        await conn.query('UPDATE customer_profiles SET points = points + ? WHERE user_id = ?', [
          earnedPoints,
          order.user_id,
        ]);
        await conn.query(
          'INSERT INTO loyalty_transactions (user_id, order_id, points, type, description) VALUES (?, ?, ?, ?, ?)',
          [order.user_id, order.id, earnedPoints, 'earn', `Tích lũy ${earnedPoints} điểm từ đơn hàng ${order.code}`]
        );
      }
    }

    const historyNote = status === 'CANCELLED' ? (cancelReason || note || 'Hủy đơn bởi nhân viên') : (note || `Cập nhật trạng thái sang ${status}`);

    await conn.query('UPDATE orders SET status = ?, payment_status = CASE WHEN ? = "COMPLETED" THEN "paid" ELSE payment_status END WHERE id = ?', [status, status, id]);
    await conn.query(
      'INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, ?, ?, ?)',
      [id, status, historyNote, req.user?.userId || null]
    );

    await enqueueOrderEvents(conn, {...order,status}, 'status:'+id+':'+status);
    await conn.commit();
    return sendSuccess(res, null, `Đã cập nhật trạng thái đơn hàng sang ${status}`);
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, err.status || 500);
  } finally {
    conn.release();
  }
});

// 4. POS (BÁN HÀNG TẠI QUẦY)
router.get(['/customers/lookup', '/pos/customer-lookup'], async (req: Request, res: Response) => {
  const phone = (req.query.phone as string)?.trim();
  if (!phone) {
    return sendError(res, 'Vui lòng cung cấp số điện thoại', 400);
  }
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.phone, u.full_name, u.full_name as fullName, u.avatar,
              COALESCE(cp.tier, 'bronze') as tier, COALESCE(cp.points, 0) as points, COALESCE(cp.points, 0) as loyalty_points
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       WHERE u.phone = ? AND u.role = 'customer'`,
      [phone]
    );
    if (rows.length === 0) {
      return sendError(res, 'Không tìm thấy thông tin khách hàng', 404);
    }
    return sendSuccess(res, rows[0], 'Tìm thấy khách hàng');
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post(['/pos/orders', '/pos/checkout'], normalizePos, validate(posSchema), async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);
  const { customerPhone, items, couponCode, pointsToUse = 0, paymentMethod = 'cod', cashReceived } = req.body;
  try { requirePaymentConfig(paymentMethod); } catch(e:any) { return sendError(res,e.message,503); }
  const requestKey=req.get('Idempotency-Key');
  if(requestKey && !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey)) return sendError(res,'Invalid idempotency key',400);

  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Giỏ hàng tại quầy không được để trống', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const allocations:Allocation[]=[];
    if(requestKey) {
      const hash=createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
      await conn.execute('INSERT IGNORE INTO pos_requests (user_id,request_key,payload_hash) VALUES (?,?,?)',[req.user!.userId,requestKey,hash]);
      const [requests]=await conn.query<any[]>('SELECT * FROM pos_requests WHERE user_id=? AND request_key=? FOR UPDATE',[req.user!.userId,requestKey]);
      if(requests[0].payload_hash!==hash) {await conn.rollback();return sendError(res,'Idempotency key belongs to a different sale',409);}
      if(requests[0].order_id) {
        const [orders]=await conn.query<any[]>('SELECT * FROM orders WHERE id=?',[requests[0].order_id]);const o=orders[0];
        await conn.rollback();return sendSuccess(res,{orderId:o.id,orderCode:o.code,total:Number(o.total),paymentStatus:o.payment_status,status:o.status,paymentPayload:paymentData(o.payment_method,o.code,Number(o.total),req.ip)},'Existing sale',200);
      }
    }

    let customerId: number | null = null;
    let customerName = 'Khách mua tại quầy';

    if (customerPhone) {
      const [uRows] = await conn.query<any[]>('SELECT id, full_name FROM users WHERE phone = ?', [customerPhone]);
      if (uRows.length > 0) {
        customerId = uRows[0].id;
        customerName = uRows[0].full_name;
      }
    }

    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const [vRows] = await conn.query<any[]>(
        `SELECT pv.id, pv.price, pv.label, p.name as product_name
         FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ? AND p.status = 'active'`,
        [item.variantId]
      );
      if (vRows.length === 0) throw new Error(`Không tìm thấy sản phẩm #${item.variantId}`);
      const variant = vRows[0];

      const [inv] = await conn.query<any[]>(
        'SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ? FOR UPDATE',
        [storeId, item.variantId]
      );
      const stock = inv.length > 0 ? inv[0].qty : 0;
      if (stock < item.qty) {
        throw new Error(`Sản phẩm "${variant.product_name}" không đủ tồn kho tại quầy (còn ${stock})`);
      }

      allocations.push(...await consumeBatches(conn,storeId,item.variantId,item.qty));
      await conn.query('UPDATE inventory SET qty = qty - ? WHERE store_id = ? AND variant_id = ?', [
        item.qty,
        storeId,
        item.variantId,
      ]);

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

    let discount = 0;
    if (couponCode) {
      const [cRows] = await conn.query<any[]>(
        'SELECT * FROM coupons WHERE code = ? AND expires_at > NOW() AND used < max_uses',
        [couponCode.trim().toUpperCase()]
      );
      if (cRows.length > 0 && subtotal >= cRows[0].min_order) {
        discount = cRows[0].type === 'percent' ? Math.floor((subtotal * cRows[0].value) / 100) : cRows[0].value;
      }
    }

    if (pointsToUse > 0) {
      if (!customerId) throw new Error('Cần chọn khách hàng thành viên để sử dụng điểm');
      const [profiles] = await conn.query<any[]>('SELECT points FROM customer_profiles WHERE user_id = ? FOR UPDATE', [customerId]);
      if (!profiles.length || profiles[0].points < pointsToUse) throw new Error('Điểm tích lũy không đủ');
      const redeemed = Math.min(pointsToUse, Math.floor(Math.max(0, subtotal - discount) / 1000));
      discount += redeemed * 1000;
      if (redeemed) {
        await conn.query('UPDATE customer_profiles SET points = points - ? WHERE user_id = ?', [redeemed, customerId]);
        await conn.query('INSERT INTO loyalty_transactions (user_id, points, type, description) VALUES (?, ?, "redeem", ?)', [customerId, redeemed, 'Sử dụng điểm thanh toán POS']);
      }
    }
    const total = Math.max(0, subtotal - discount);
    if(paymentMethod==='cod'&&cashReceived!==undefined&&cashReceived<total)throw new Error('Tiền khách đưa chưa đủ theo tổng tiền máy chủ xác nhận');
    const orderCode = 'POS'+Date.now()+randomBytes(3).toString('hex').toUpperCase();

    const [orderRes]: any = await conn.query(
      `INSERT INTO orders (
        code, user_id, store_id, receiver_name, receiver_phone, receiver_address,
        delivery_type, delivery_date, delivery_slot, subtotal, ship_fee, discount,
        total, payment_method, payment_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pickup', CURDATE(), 'Tại quầy', ?, 0, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        customerId,
        storeId,
        customerName,
        customerPhone || '0900000000',
        'Mua trực tiếp tại cửa hàng',
        subtotal,
        discount,
        total,
        paymentMethod,
        paymentMethod === 'cod' || total === 0 ? 'paid' : 'unpaid',
        paymentMethod === 'cod' || total === 0 ? 'COMPLETED' : 'PENDING',
      ]
    );

    const orderId = orderRes.insertId;
    await recordAllocations(conn,orderId,allocations);
    if(requestKey) await conn.execute('UPDATE pos_requests SET order_id=? WHERE user_id=? AND request_key=?',[orderId,req.user!.userId,requestKey]);

    for (const it of validatedItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, variant_id, product_name, variant_label, unit_price, qty, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, it.variantId, it.productName, it.variantLabel, it.unitPrice, it.qty, it.totalPrice]
      );
    }

    // Award loyalty points if customer phone registered
    if (customerId && (paymentMethod === 'cod' || total === 0)) {
      const earned = Math.floor(total * 0.05 / 1000);
      if (earned > 0) {
        await conn.query('UPDATE customer_profiles SET points = points + ? WHERE user_id = ?', [earned, customerId]);
        await conn.query(
          'INSERT INTO loyalty_transactions (user_id, order_id, points, type, description) VALUES (?, ?, ?, ?, ?)',
          [customerId, orderId, earned, 'earn', `Tích lũy ${earned} điểm đơn POS ${orderCode}`]
        );
      }
    }

    await conn.query(
      'INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, ?, "POS", ?)',
      [orderId, paymentMethod === 'cod' || total === 0 ? 'COMPLETED' : 'PENDING', req.user?.userId]
    );

    await conn.commit();
    return sendSuccess(res, { orderId, orderCode, total, paymentStatus: paymentMethod === 'cod' || total === 0 ? 'paid' : 'unpaid', status: paymentMethod === 'cod' || total === 0 ? 'COMPLETED' : 'PENDING', paymentPayload: paymentData(paymentMethod,orderCode,total,req.ip) }, 'Tạo đơn bán tại quầy thành công!', 201);
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, err.status || 400);
  } finally {
    conn.release();
  }
});

// 5. STORE INVENTORY (XEM, NHẬP HÀNG, BÁO HAO HỤT)
router.get('/inventory', async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);

  try {
    const [inventory] = await pool.query<any[]>(
      `SELECT inv.store_id, inv.variant_id, inv.qty, inv.qty as quantity,
              pv.label as variant_label, pv.price, pv.sku,
              p.id as product_id, p.name as product_name, p.origin,
              (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as thumbnail
       FROM inventory inv
       JOIN product_variants pv ON inv.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE inv.store_id = ?
       ORDER BY inv.qty ASC, p.name ASC`,
      [storeId]
    );

    return sendSuccess(res, inventory);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post(['/inventory/adjust', '/inventory/stock-in', '/inventory/waste'], (req, _res, next) => {
  const b = req.body || {};
  req.body = { variantId: b.variantId ?? b.variant_id, changeQty: b.changeQty ?? b.quantity,
    reason: b.reason ?? b.note, batchNo: b.batchNo, expiresAt: b.expiresAt, type: req.path.endsWith('/waste') ? 'waste' : req.path.endsWith('/stock-in') ? 'import' : b.type };
  next();
}, validate(z.object({ variantId: z.number().int().positive(), changeQty: z.number().int().positive(), reason: z.string().optional(), type: z.enum(['import', 'waste']).default('import'), batchNo:z.string().trim().min(1).max(100).optional(), expiresAt:z.string().datetime({offset:true}).optional() })), async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);
  const { variantId, changeQty, reason, type = 'import', batchNo, expiresAt } = req.body;
  if(type==='import' && (!batchNo || !expiresAt || Date.parse(expiresAt)<=Date.now())) return sendError(res,'Batch number and future expiry are required',400); // type: 'import' or 'waste'

  if (!variantId || !changeQty) {
    return sendError(res, 'Vui lòng cung cấp mã biến thể và số lượng điều chỉnh', 400);
  }

  const delta = type === 'waste' ? -changeQty : changeQty;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SELECT variant_id FROM inventory WHERE store_id=? AND variant_id=? FOR UPDATE',[storeId,variantId]);
    if (type === 'waste') {
      await consumeBatches(conn,storeId,variantId,changeQty,true);
      const [result] = await conn.execute<any>('UPDATE inventory SET qty = qty - ? WHERE store_id = ? AND variant_id = ? AND qty >= ?', [changeQty, storeId, variantId, changeQty]);
      if (!result.affectedRows) { await conn.rollback(); return sendError(res, 'S? l??ng hao h?t v??t qu? t?n kho', 409); }
    } else {
      await conn.execute('INSERT INTO inventory_batches (store_id,variant_id,batch_no,qty,expires_at) VALUES (?,?,?,?,?)',[storeId,variantId,batchNo,changeQty,new Date(expiresAt)]);
      await conn.execute('INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)', [storeId, variantId, changeQty]);
    }
    await conn.execute('INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, "inventory", ?, ?)', [req.user!.userId, type === 'waste' ? 'REPORT_WASTE' : 'STOCK_IMPORT', variantId, JSON.stringify({storeId, delta, reason: reason || 'Điều chỉnh kiểm kê'})]);
    await conn.commit();
    return sendSuccess(res, null, type === 'waste' ? '?? ghi nh?n b?o hao h?t' : '?? nh?p h?ng v?o kho th?nh c?ng');
  } catch (err: any) { await conn.rollback(); return sendError(res, err.code==='ER_DUP_ENTRY'?'Mã lô đã tồn tại. Kiểm tra phiếu nhập để tránh nhập trùng.':err.message, err.code==='ER_DUP_ENTRY'?409:err.status || 500); }
  finally { conn.release(); }
});

// 6. RETURNS MANAGEMENT
router.get('/returns', async (req: Request, res: Response) => {
  const storeId = getTargetStoreId(req);
  try {
    const [returns] = await pool.query<any[]>(
      `SELECT rr.*, o.code as order_code, o.receiver_name, o.receiver_phone, o.total, o.created_at as order_created_at
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.id
       WHERE o.store_id = ?
       ORDER BY rr.id DESC`,
      [storeId]
    );
    return sendSuccess(res, returns.map(r => ({ ...r, images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images || [] })));
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.put(['/returns/:id', '/returns/:id/decision'], decideReturn);

// 7. TIME ATTENDANCE & SHIFTS
router.get('/attendance', async (req: Request, res: Response) => {
  const staffId = req.user!.userId;
  try {
    const [records] = await pool.query<any[]>(
      'SELECT * FROM attendance WHERE staff_id = ? ORDER BY id DESC LIMIT 30',
      [staffId]
    );
    const [shifts] = await pool.query<any[]>(
      'SELECT * FROM shifts WHERE staff_id = ? AND date >= CURDATE() - INTERVAL 1 DAY ORDER BY date ASC',
      [staffId]
    );

    // Check today's check-in status
    const [todayCheckin] = await pool.query<any[]>(
      'SELECT * FROM attendance WHERE staff_id = ? AND DATE(check_in) = CURDATE() ORDER BY id DESC LIMIT 1',
      [staffId]
    );

    return sendSuccess(res, {
      todayStatus: todayCheckin[0] || null,
      shifts,
      records,
    });
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/attendance/check-in', validate(z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy:z.number().min(0).max(100).optional(),note:z.string().max(500).optional()})), async (req: Request, res: Response) => {
  const staffId = req.user!.userId;
  const storeId = getTargetStoreId(req);
  const { note,lat,lng } = req.body;
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SELECT id FROM users WHERE id=? FOR UPDATE',[staffId]);
    const [stores]=await conn.query<any[]>('SELECT lat,lng FROM stores WHERE id=? AND is_active=1',[storeId]);
    if(!stores.length){await conn.rollback();return sendError(res,'Chi nhánh không hoạt động',400);}
    const rad=(n:number)=>n*Math.PI/180,store=stores[0],dLat=rad(lat-Number(store.lat)),dLng=rad(lng-Number(store.lng));
    const a=Math.sin(dLat/2)**2+Math.cos(rad(Number(store.lat)))*Math.cos(rad(lat))*Math.sin(dLng/2)**2;
    const distance=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
    const configured=Number(process.env.ATTENDANCE_RADIUS_METERS||200),radius=Number.isFinite(configured)&&configured>0?configured:200;
    if(distance>radius){await conn.rollback();return sendError(res,`Bạn đang cách chi nhánh ${Math.round(distance)}m, ngoài phạm vi chấm công ${radius}m`,403);}
    const [open]=await conn.query<any[]>('SELECT id FROM attendance WHERE staff_id=? AND check_out IS NULL',[staffId]);
    if(open.length){await conn.rollback();return sendError(res,'Bạn đã vào ca. Kết thúc ca hiện tại trước khi vào ca mới.',409);}
    const [resInsert]: any = await conn.query(
      'INSERT INTO attendance (staff_id, store_id, check_in, status, note) VALUES (?, ?, NOW(), "on_time", ?)',
      [staffId, storeId, (note||'Check-in GPS')+` · cách chi nhánh ${Math.round(distance)}m`]
    );
    await conn.commit();
    return sendSuccess(res, { id: resInsert.insertId }, 'Check-in ca làm việc thành công!');
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, err.status || 500);
  }finally{conn.release();}
});

router.post('/attendance/check-out', async (req: Request, res: Response) => {
  const staffId = req.user!.userId;
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id FROM attendance WHERE staff_id = ? AND check_out IS NULL ORDER BY id DESC LIMIT 1',
      [staffId]
    );
    if (rows.length === 0) return sendError(res, 'Bạn chưa check-in ca làm việc', 400);

    await pool.query('UPDATE attendance SET check_out = NOW() WHERE id = ?', [rows[0].id]);
    return sendSuccess(res, null, 'Check-out kết thúc ca làm việc thành công!');
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// 8. ASSIGNED TICKETS / FEEDBACK
router.get('/tickets', async (req: Request, res: Response) => {
  const staffId = req.user!.userId;
  try {
    const [tickets] = await pool.query<any[]>(
      'SELECT * FROM feedbacks WHERE assigned_to = ? OR assigned_to IS NULL ORDER BY status ASC, id DESC',
      [staffId]
    );
    return sendSuccess(res, tickets);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.put('/tickets/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'in_progress', 'resolved'

  try {
    await pool.query('UPDATE feedbacks SET status = ?, assigned_to = ? WHERE id = ?', [
      status,
      req.user?.userId,
      id,
    ]);
    return sendSuccess(res, null, 'Cập nhật trạng thái phản hồi khách hàng thành công');
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

export default router;
