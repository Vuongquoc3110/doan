import { transferBatches, restoreBatches, consumeBatches, recordAllocations } from '../services/batches';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { statusFilter } from '../utils/api-contract';
import { decideReturn } from '../utils/return-decision';
import { randomBytes } from 'crypto';
import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate, requireRole } from '../middlewares/auth';
import { hashPassword } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

// ==========================================
// 1. DASHBOARD & ANALYTICS
// ==========================================
router.get(['/dashboard', '/analytics/dashboard'], async (_req: Request, res: Response) => {
  try {
    // 1. Orders by status
    const [statusStats] = await pool.query<any[]>(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_amount
       FROM orders GROUP BY status`
    );

    // 2. Revenue daily from view
    const [dailyRevenue] = await pool.query<any[]>(
      'SELECT * FROM view_daily_revenue ORDER BY report_date DESC LIMIT 14'
    );

    // 3. Store revenue from view
    const [storeRevenue] = await pool.query<any[]>(
      'SELECT * FROM view_store_revenue LIMIT 10'
    );

    // 4. Top selling products
    const [topProducts] = await pool.query<any[]>(
      `SELECT oi.product_name, SUM(oi.qty) as total_qty, SUM(oi.total_price) as total_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'COMPLETED'
       GROUP BY oi.product_name
       ORDER BY total_qty DESC, total_sales DESC
       LIMIT 5`
    );

    // 5. Total counts
    const [totalUsers] = await pool.query<any[]>('SELECT COUNT(*) as c FROM users WHERE role = "customer"');
    const [totalOrders] = await pool.query<any[]>('SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status = "COMPLETED"');
    const [totalProducts] = await pool.query<any[]>('SELECT COUNT(*) as c FROM products');
    const [pendingReturns] = await pool.query<any[]>('SELECT COUNT(*) as c FROM return_requests WHERE status = "pending"');

    const chartDays = [...dailyRevenue].reverse();
    return sendSuccess(res, {
      total_revenue: Number(totalOrders[0]?.totalRevenue ?? 0),
      total_orders: Number(totalOrders[0]?.c ?? 0),
      total_customers: Number(totalUsers[0]?.c ?? 0),
      total_products: Number(totalProducts[0]?.c ?? 0),
      pending_returns: pendingReturns[0]?.c || 0,
      revenue_chart: {
        labels: chartDays.map(day => new Date(day.report_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })),
        data: chartDays.map(day => Number(day.daily_revenue) || 0),
      },
      top_stores: storeRevenue.map((s: any) => ({
        name: s.store_name,
        revenue: s.total_revenue,
        orders: Number(s.completed_orders) || 0,
      })),
      summary: {
        totalCustomers: totalUsers[0]?.c || 0,
        totalCompletedOrders: totalOrders[0]?.c || 0,
        totalRevenue: totalOrders[0]?.totalRevenue || 0,
        totalProducts: totalProducts[0]?.c || 0,
        pendingReturns: pendingReturns[0]?.c || 0,
      },
      statusStats,
      dailyRevenue,
      storeRevenue,
      topProducts,
    });
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// ==========================================
// 2. PRODUCT CRUD
// ==========================================
router.get('/products', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const searchPattern = '%' + search + '%';
    const [countRes] = await pool.query<any[]>('SELECT COUNT(*) as total FROM products WHERE name LIKE ?', [searchPattern]);
    const total = countRes[0]?.total || 0;

    const [products] = await pool.query<any[]>(
      `SELECT p.*, c.name as category_name,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort ASC LIMIT 1) as thumbnail,
        (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.name LIKE ?
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [searchPattern, limit, offset]
    );

    return sendSuccess(res, products, 'Lấy danh sách sản phẩm thành công', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/products', async (req: Request, res: Response) => {
  const { name, slug, description, origin, base_price, compare_price, discount_percent, category_id, is_gift, status, variants, images } = req.body;
  if(Array.isArray(variants)&&variants.some(v=>Number(v.initialStock)>0))return sendError(res,'Tạo sản phẩm trước, sau đó nhập hàng theo lô và hạn dùng tại chi nhánh',400);

  if (!name || !base_price || !category_id) {
    return sendError(res, 'Vui lòng điền tên, giá gốc và danh mục sản phẩm', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const [resProd]: any = await conn.query(
      `INSERT INTO products (name, slug, description, origin, base_price, compare_price, discount_percent, category_id, is_gift, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, productSlug, description || null, origin || 'Nhập Khẩu', base_price, compare_price || null, discount_percent || 0, category_id, is_gift ? 1 : 0, status || 'active']
    );

    const productId = resProd.insertId;

    // Insert variants
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const sku = v.sku || `SKU-${productId}-${Date.now().toString().slice(-4)}`;
        const [vRes]: any = await conn.query(
          'INSERT INTO product_variants (product_id, label, price, sku) VALUES (?, ?, ?, ?)',
          [productId, v.label || 'Mặc định', v.price || base_price, sku]
        );
        const variantId = vRes.insertId;

        const [stores]=await conn.query<any[]>('SELECT id FROM stores');
        for (const {id:sId} of stores) {
          await conn.query('INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, ?)', [
            sId,
            variantId,
            0,
          ]);
        }
      }
    } else {
      // Default variant
      const [vRes]: any = await conn.query(
        'INSERT INTO product_variants (product_id, label, price, sku) VALUES (?, ?, ?, ?)',
        [productId, 'Tiêu chuẩn', base_price, `SKU-${productId}-STD`]
      );
      const [stores]=await conn.query<any[]>('SELECT id FROM stores');
      for (const {id:sId} of stores) {
        await conn.query('INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, ?)', [
          sId,
          vRes.insertId,
          0,
        ]);
      }
    }

    // Insert images
    if (images && Array.isArray(images)) {
      for (let idx = 0; idx < images.length; idx++) {
        await conn.query('INSERT INTO product_images (product_id, url, sort) VALUES (?, ?, ?)', [
          productId,
          images[idx],
          idx + 1,
        ]);
      }
    }

    await conn.commit();
    return sendSuccess(res, { productId }, 'Tạo sản phẩm mới thành công', 201);
  } catch (err: any) {
    await conn.rollback();
    return sendError(res,err.code==='ER_DUP_ENTRY'?'Tên đường dẫn hoặc SKU đã tồn tại':err.code==='ER_NO_REFERENCED_ROW_2'?'Danh mục không tồn tại':err.message,err.code==='ER_DUP_ENTRY'?409:err.code==='ER_NO_REFERENCED_ROW_2'?400:err.status||500);
  } finally {
    conn.release();
  }
});

router.put(['/products/:id', '/products/:id/price'], (req, _res, next) => {
  req.body = { ...req.body, base_price: req.body.base_price ?? req.body.price };
  next();
}, validate(z.object({ name: z.string().min(1).optional(), description: z.string().optional(), origin: z.string().optional(),
  base_price: z.number().positive().optional(), compare_price: z.number().nonnegative().nullable().optional(),
  discount_percent: z.number().min(0).max(100).optional(), category_id: z.number().int().positive().optional(),
  is_gift: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(), status: z.enum(['active', 'inactive']).optional()
}).refine(b => Object.values(b).some(v => v !== undefined), 'Cần cung cấp thông tin cập nhật')), async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [products] = await conn.query<any[]>('SELECT * FROM products WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!products.length) { await conn.rollback(); return sendError(res, 'Sản phẩm không tồn tại', 404); }
    const fields = Object.entries(req.body).filter(([, value]) => value !== undefined);
    await conn.query('UPDATE products SET ' + fields.map(([key]) => key + ' = ?').join(', ') + ' WHERE id = ?', [...fields.map(([, value]) => value), req.params.id]);
    if (req.body.base_price !== undefined) {
      // Preserve the relative prices of standard and bulk packages.
      const factor = req.body.base_price / Number(products[0].base_price);
      await conn.query('UPDATE product_variants SET price = ROUND(price * ?) WHERE product_id = ?', [factor, req.params.id]);
    }
    await conn.commit();
    return sendSuccess(res, null, 'Cập nhật sản phẩm thành công');
  } catch (err: any) { await conn.rollback(); return sendError(res, err.message, err.status || 500); }
  finally { conn.release(); }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return sendSuccess(res, null, 'Đã xóa sản phẩm');
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// ==========================================
// 3. CATEGORIES & COLLECTIONS CRUD
// ==========================================
router.post('/categories', async (req: Request, res: Response) => {
  const { name, slug, sort } = req.body;
  if (!name) return sendError(res, 'Tên danh mục không được để trống', 400);

  try {
    const cSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await pool.query('INSERT INTO categories (name, slug, sort) VALUES (?, ?, ?)', [name, cSlug, sort || 0]);
    return sendSuccess(res, null, 'Thêm danh mục thành công', 201);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/collections', async (req: Request, res: Response) => {
  const { name, slug, type, banner, start_at, end_at } = req.body;
  if (!name) return sendError(res, 'Tên bộ sưu tập không được để trống', 400);

  try {
    const colSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await pool.query(
      'INSERT INTO collections (name, slug, type, banner, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, colSlug, type || 'product', banner || null, start_at || null, end_at || null]
    );
    return sendSuccess(res, null, 'Thêm bộ sưu tập thành công', 201);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// ==========================================
// 4. ORDERS MANAGEMENT ACROSS SYSTEM
// ==========================================
router.get('/orders', statusFilter, async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const storeId = req.query.store_id as string;
  const search = req.query.search as string;

  try {
    const conditions = [];
    const params: any[] = [];

    if (status && status !== 'all') {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (storeId) {
      conditions.push('o.store_id = ?');
      params.push(storeId);
    }

    if (search && search.trim()) {
      conditions.push('(o.code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [orders] = await pool.query<any[]>(
      `SELECT o.*, s.name as store_name, u.phone as customer_phone
       FROM orders o
       LEFT JOIN stores s ON o.store_id = s.id
       LEFT JOIN users u ON o.user_id = u.id
       ${where}
       ORDER BY o.id DESC`,
      params
    );

    return sendSuccess(res, orders);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

const assignStore = async (req: Request, res: Response) => {
  const newStoreId = req.body.newStoreId ?? req.body.to_store_id;
  const reason = req.body.reason ?? req.body.note ?? '';
  if (!Number.isInteger(newStoreId) || newStoreId <= 0 || typeof reason !== 'string') return sendError(res, 'Chi nhánh đích không hợp lệ', 400);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.query<any[]>('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!orders.length) { await conn.rollback(); return sendError(res, 'Đơn hàng không tồn tại', 404); }
    const order = orders[0];
    if (!['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) { await conn.rollback(); return sendError(res, 'Không thể chuyển chi nhánh cho đơn đang giao hoặc đã kết thúc', 409); }
    const [stores] = await conn.query<any[]>('SELECT id FROM stores WHERE id = ? AND is_active = 1', [newStoreId]);
    if (!stores.length) { await conn.rollback(); return sendError(res, 'Chi nhánh không tồn tại hoặc đã tạm dừng', 400); }
    if (order.store_id === newStoreId) { await conn.rollback(); return sendSuccess(res, null, 'Đơn hàng đã thuộc chi nhánh này'); }
    await restoreBatches(conn,order.id,order.store_id);
    const [items] = await conn.query<any[]>('SELECT variant_id, SUM(qty) as qty FROM order_items WHERE order_id = ? GROUP BY variant_id ORDER BY variant_id', [order.id]);
    for (const item of items) {
      const [inventory] = await conn.query<any[]>('SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ? FOR UPDATE', [newStoreId, item.variant_id]);
      if (!inventory.length || Number(inventory[0].qty) < Number(item.qty)) { await conn.rollback(); return sendError(res, 'Chi nhánh đích không đủ tồn kho để nhận đơn', 409); }
      await recordAllocations(conn,order.id,await consumeBatches(conn,newStoreId,item.variant_id,Number(item.qty)));
      await conn.query('UPDATE inventory SET qty = qty - ? WHERE store_id = ? AND variant_id = ?', [item.qty, newStoreId, item.variant_id]);
      await conn.query('INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)', [order.store_id, item.variant_id, item.qty]);
    }
    await conn.query('UPDATE orders SET store_id = ? WHERE id = ?', [newStoreId, order.id]);
    await conn.query('INSERT INTO order_status_history (order_id, status, note, by_user_id) VALUES (?, ?, ?, ?)', [order.id, order.status, 'Chuyển chi nhánh #' + newStoreId + ': ' + reason, req.user!.userId]);
    await conn.commit();
    return sendSuccess(res, null, 'Chuyển chi nhánh xử lý đơn hàng thành công');
  } catch (err: any) { await conn.rollback(); return sendError(res, err.message, err.status || 500); }
  finally { conn.release(); }
};
router.put('/orders/:id/assign-store', assignStore);
router.post('/orders/:id/transfer', assignStore);

// ==========================================
// 5. INVENTORY & STOCK TRANSFER
// ==========================================
router.get(['/inventory', '/inventory/overview'], async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT CONCAT(i.store_id,'-',i.variant_id) as id, i.store_id, i.variant_id, i.qty as quantity,
              pv.label as variant_name, pv.price,
              p.name as product_name, s.name as store_name
       FROM inventory i
       JOIN product_variants pv ON i.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       JOIN stores s ON i.store_id = s.id
       ORDER BY i.qty ASC
       LIMIT 50`
    );
    return sendSuccess(res, rows);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/inventory/transfer', async (req: Request, res: Response) => {
  const fromStoreId = req.body.fromStoreId || req.body.from_store_id;
  const toStoreId = req.body.toStoreId || req.body.to_store_id;
  const variantId = req.body.variantId || req.body.variant_id;
  const qty = Number(req.body.qty || req.body.quantity);
  const note = req.body.note;

  if (![fromStoreId,toStoreId,variantId,qty].every(value=>Number.isInteger(Number(value))&&Number(value)>0&&Number(value)<=2147483647)||Number(fromStoreId)===Number(toStoreId)) {
    return sendError(res, 'Thông tin điều chuyển kho không hợp lệ', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [invFrom] = await conn.query<any[]>(
      'SELECT qty FROM inventory WHERE store_id = ? AND variant_id = ? FOR UPDATE',
      [fromStoreId, variantId]
    );

    const fromStock = invFrom.length > 0 ? invFrom[0].qty : 0;
    if (fromStock < qty) {
      await conn.rollback();
      return sendError(res, `Kho nguồn không đủ số lượng (còn ${fromStock}, yêu cầu chuyển ${qty})`, 400);
    }

    await transferBatches(conn,Number(fromStoreId),Number(toStoreId),Number(variantId),qty);
    // Deduct from source store
    await conn.query('UPDATE inventory SET qty = qty - ? WHERE store_id = ? AND variant_id = ?', [
      qty,
      fromStoreId,
      variantId,
    ]);

    // Add to dest store
    await conn.query(
      `INSERT INTO inventory (store_id, variant_id, qty) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE qty = qty + ?`,
      [toStoreId, variantId, qty, qty]
    );

    await conn.query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, "STOCK_TRANSFER", "inventory", ?, ?)',
      [
        req.user?.userId,
        variantId,
        JSON.stringify({ fromStoreId, toStoreId, qty, note: note || 'Điều chuyển hàng liên chi nhánh' }),
      ]
    );

    await conn.commit();
    return sendSuccess(res, null, 'Điều chuyển tồn kho giữa 2 chi nhánh thành công');
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, err.status || 500);
  } finally {
    conn.release();
  }
});

// ==========================================
// 6. STORES CRUD
// ==========================================
router.get('/stores', async (req: Request, res: Response) => {
  const city = req.query.city === 'TP. Hồ Chí Minh' ? 'Hồ Chí Minh' : req.query.city;
  try {
    const [stores] = await pool.query<any[]>('SELECT s.*, (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id AND DATE(o.created_at) = CURDATE()) as today_orders, (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.store_id = s.id AND o.status = "COMPLETED" AND DATE(o.created_at) = CURDATE()) as today_revenue FROM stores s WHERE (? IS NULL OR s.city = ?) ORDER BY s.id', [city || null, city || null]);
    return sendSuccess(res, stores.map(store => ({...store, is_active: Boolean(store.is_active)})));
  } catch (err: any) { return sendError(res, err.message, err.status || 500); }
});
router.put('/stores/:id/status', validate(z.object({is_active: z.boolean()})), async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute<any>('UPDATE stores SET is_active = ? WHERE id = ?', [req.body.is_active, req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Chi nhánh không tồn tại', 404);
    return sendSuccess(res, {is_active: req.body.is_active}, 'Đã cập nhật trạng thái chi nhánh');
  } catch (err: any) { return sendError(res, err.message, err.status || 500); }
});

router.post('/stores', async (req: Request, res: Response) => {
  const { name, address, district, city, lat, lng, phone, open_hours, ship_fee_rules } = req.body;
  if (!name || !address || !district || !lat || !lng || !phone) {
    return sendError(res, 'Vui lòng nhập đầy đủ thông tin cửa hàng', 400);
  }

  try {
    await pool.query(
      'INSERT INTO stores (name, address, district, city, lat, lng, phone, open_hours, ship_fee_rules) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        address,
        district,
        city || 'Hà Nội',
        lat,
        lng,
        phone,
        open_hours || '07:00 - 22:00',
        ship_fee_rules ? JSON.stringify(ship_fee_rules) : null,
      ]
    );
    return sendSuccess(res, null, 'Thêm chi nhánh cửa hàng mới thành công', 201);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// ==========================================
// 7. USER MANAGEMENT (CUSTOMERS & STAFF)
// ==========================================
router.get('/users', async (req: Request, res: Response) => {
  const role = req.query.role as string;
  try {
    const conditions = [];
    const params: any[] = [];
    if (role && role !== 'all') {
      if(!['customer','staff','admin'].includes(role))return sendError(res,'Vai trò không hợp lệ',400);
      conditions.push('u.role = ?');
      params.push(role);
    }

    const search=typeof req.query.search==='string'?req.query.search.trim():'';
    if(search){conditions.push('(u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)');params.push('%'+search+'%','%'+search+'%','%'+search+'%');}
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [users] = await pool.query<any[]>(
      `SELECT u.id, u.phone, u.email, u.full_name, u.role, u.avatar, u.status, u.created_at,
              cp.tier, cp.points,
              sp.store_id, sp.position, s.name as store_name
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       LEFT JOIN stores s ON sp.store_id = s.id
       ${where}
       ORDER BY u.id DESC`,
      params
    );

    return sendSuccess(res, users);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.put('/users/:id/status', validate(z.object({status:z.enum(['active','blocked'])})), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'blocked'

  try {
    if(Number(id)===req.user!.userId&&status==='blocked')return sendError(res,'Không thể tự khóa tài khoản đang đăng nhập',409);
    const [users]=await pool.query<any[]>('SELECT id,role FROM users WHERE id=?',[id]);
    if(!users.length)return sendError(res,'Không có tài khoản',404);
    if(users[0].role==='admin'&&status==='blocked')return sendError(res,'Không khóa tài khoản quản trị tại màn hình này',409);
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return sendSuccess(res, null, `Đã ${status === 'blocked' ? 'khóa' : 'mở khóa'} tài khoản người dùng`);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/users/staff', validate(z.object({phone:z.string().regex(/^0\d{9}$/),fullName:z.string().trim().min(2).max(100),password:z.string().min(8).max(100),storeId:z.number().int().positive(),position:z.string().max(100).optional()})), async (req: Request, res: Response) => {
  const { phone, fullName, password, storeId, position } = req.body;
  if (!phone || !fullName || !password || !storeId) {
    return sendError(res, 'Vui lòng cung cấp số điện thoại, họ tên, mật khẩu và chi nhánh làm việc', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [stores]=await conn.query<any[]>('SELECT id FROM stores WHERE id=? AND is_active=1',[storeId]);
    if(!stores.length){await conn.rollback();return sendError(res,'Chi nhánh không hoạt động',400);}
    const [duplicate]=await conn.query<any[]>('SELECT id FROM users WHERE phone=?',[phone]);
    if(duplicate.length){await conn.rollback();return sendError(res,'Số điện thoại đã có tài khoản',409);}
    const hashedPassword = hashPassword(password);
    const [uRes]: any = await conn.query(
      'INSERT INTO users (phone, password_hash, full_name, role, status) VALUES (?, ?, ?, "staff", "active")',
      [phone, hashedPassword, fullName]
    );

    const newUserId = uRes.insertId;
    await conn.query(
      'INSERT INTO staff_profiles (user_id, store_id, position) VALUES (?, ?, ?)',
      [newUserId, storeId, position || 'Nhân viên bán hàng']
    );

    await conn.commit();
    return sendSuccess(res, { userId: newUserId }, 'Tạo tài khoản nhân viên thành công', 201);
  } catch (err: any) {
    await conn.rollback();
    return sendError(res, err.message, err.status || 500);
  } finally {
    conn.release();
  }
});

// ==========================================
// 8. MARKETING (COUPONS & BULK GIFT CARDS)
// ==========================================
router.get('/coupons', async (_req: Request, res: Response) => {
  try {
    const [coupons] = await pool.query<any[]>('SELECT * FROM coupons ORDER BY id DESC');
    return sendSuccess(res, coupons);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post('/coupons', (req, _res, next) => {
  const b = req.body || {};
  req.body = { ...b, type: b.type ?? (b.discount_amount !== undefined ? 'fixed' : undefined), value: b.value ?? b.discount_amount };
  next();
}, validate(z.object({ code: z.string().trim().min(1).max(50), type: z.enum(['percent', 'fixed']), value: z.number().positive(), min_order: z.number().min(0).default(0), max_uses: z.number().int().positive().default(100), expires_at: z.string().min(10) }).refine(b => b.type !== 'percent' || b.value <= 100, 'Phần trăm giảm giá tối đa 100').refine(b => Number.isFinite(Date.parse(b.expires_at)) && Date.parse(b.expires_at) > Date.now(), 'Ngày hết hạn phải ở tương lai')), async (req: Request, res: Response) => {
  const { code, type, value, min_order, max_uses, expires_at } = req.body;
  if (!code || !type || !value || !expires_at) {
    return sendError(res, 'Vui lòng điền đầy đủ thông tin mã giảm giá', 400);
  }

  try {
    await pool.query(
      'INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [code.toUpperCase(), type, value, min_order || 0, max_uses || 100, expires_at]
    );
    return sendSuccess(res, null, 'Tạo mã voucher giảm giá thành công', 201);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post(['/gift-cards/bulk-generate', '/gift-cards/generate'], (req, _res, next) => {
  const b = req.body || {};
  req.body = { count: b.count ?? b.quantity, balance: b.balance ?? b.initial_balance, daysValid: b.daysValid, prefix: b.prefix };
  next();
}, validate(z.object({ count: z.number().int().min(1).max(100).default(5), balance: z.number().int().positive().default(500000), daysValid: z.number().int().min(1).max(3650).default(180), prefix: z.string().regex(/^[A-Za-z0-9]{1,12}$/).default('KF') })), async (req: Request, res: Response) => {
  const { count = 5, balance = 500000, daysValid = 180, prefix = 'KF' } = req.body;

  try {
    const generatedCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomSuffix = randomBytes(8).toString('hex').toUpperCase();
      const code = `${prefix}-${balance / 1000}K-${randomSuffix}`;
      await pool.query(
        'INSERT INTO gift_cards (code, balance, expires_at, status) VALUES (?, ?, NOW() + INTERVAL ? DAY, "active")',
        [code, balance, daysValid]
      );
      generatedCodes.push(code);
    }

    return sendSuccess(res, { count, codes: generatedCodes }, `Đã phát hành hàng loạt ${count} Gift Card thành công`, 201);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

// ==========================================
// 9. APPROVALS (REVIEWS, RETURNS, AUDIT LOGS)
// ==========================================
router.get(['/reviews', '/approvals/reviews'], async (_req: Request, res: Response) => {
  try {
    const [reviews] = await pool.query<any[]>(
      `SELECT r.*, p.name as product_name, u.full_name as user_name
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       JOIN users u ON r.user_id = u.id
       ORDER BY r.id DESC`
    );
    return sendSuccess(res, reviews);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.put(['/reviews/:id', '/approvals/reviews/:id', '/reviews/:id/status'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const status = req.body.is_approved === false || req.body.status === 'hidden' ? 'hidden' : 'approved';

  try {
    await pool.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    return sendSuccess(res, null, 'Cập nhật trạng thái đánh giá thành công');
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.get(['/returns', '/approvals/returns'], async (_req: Request, res: Response) => {
  try {
    const [returns] = await pool.query<any[]>(
      `SELECT rr.*, o.code as order_code, o.receiver_name, o.receiver_phone, o.total, s.name as store_name
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.id
       LEFT JOIN stores s ON o.store_id = s.id
       ORDER BY rr.id DESC`
    );
    return sendSuccess(res, returns);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

router.post(['/returns/:id/approve-refund', '/approvals/returns/:id/approve-refund'], decideReturn);
router.put('/returns/:id/decision', decideReturn);

router.get('/audit-logs', async (_req: Request, res: Response) => {
  try {
    const [logs] = await pool.query<any[]>(
      `SELECT al.*, u.full_name as user_name, u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.id DESC
       LIMIT 100`
    );
    return sendSuccess(res, logs);
  } catch (err: any) {
    return sendError(res, err.message, err.status || 500);
  }
});

export default router;
