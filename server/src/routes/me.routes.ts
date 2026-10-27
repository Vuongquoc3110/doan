import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticate } from '../middlewares/auth';
import { comparePassword, hashPassword } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
router.use(authenticate);

// 1. GET PROFILE
router.get('/profile', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [users] = await pool.query<any[]>(
      'SELECT id, phone, email, full_name, role, avatar, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) return sendError(res, 'Người dùng không tồn tại', 404);
    const user = users[0];

    const [cProfiles] = await pool.query<any[]>('SELECT tier, points FROM customer_profiles WHERE user_id = ?', [userId]);
    const customerProfile = cProfiles[0] || { tier: 'bronze', points: 0 };

    const [orderStats] = await pool.query<any[]>(
      `SELECT COUNT(id) as total_orders, COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as total_spent
       FROM orders WHERE user_id = ?`,
      [userId]
    );

    return sendSuccess(res, {
      ...user,
      ...customerProfile,
      orderStats: orderStats[0],
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 2. UPDATE PROFILE
router.put('/profile', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { full_name, email, avatar } = req.body;

  try {
    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), avatar = COALESCE(?, avatar) WHERE id = ?',
      [full_name, email, avatar, userId]
    );
    return sendSuccess(res, null, 'Cập nhật thông tin thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 3. CHANGE PASSWORD
router.put('/password', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { oldPassword, newPassword } = req.body;

  if (typeof oldPassword !== 'string' || !oldPassword || typeof newPassword !== 'string' || newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return sendError(res, 'Mật khẩu mới tối thiểu 6 ký tự', 400);
  }

  try {
    const [users] = await pool.query<any[]>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!users.length) return sendError(res, 'Tài khoản không tồn tại', 404);
    if (!comparePassword(oldPassword, users[0].password_hash)) {
      return sendError(res, 'Mật khẩu cũ không chính xác', 400);
    }

    const newHash = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return sendSuccess(res, null, 'Đổi mật khẩu thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 4. ADDRESSES
router.get('/addresses', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [addresses] = await pool.query<any[]>('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [userId]);
    return sendSuccess(res, addresses);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/addresses', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { receiver, phone, province, district, ward, detail, is_default } = req.body;

  if (!receiver || !phone || !detail) {
    return sendError(res, 'Vui lòng nhập đầy đủ thông tin địa chỉ', 400);
  }

  try {
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    const [resInsert]: any = await pool.query(
      'INSERT INTO addresses (user_id, receiver, phone, province, district, ward, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, receiver, phone, province || 'Hà Nội', district || '', ward || '', detail, is_default ? 1 : 0]
    );

    return sendSuccess(res, { id: resInsert.insertId }, 'Thêm địa chỉ thành công', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.put('/addresses/:id/default', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    await pool.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return sendSuccess(res, null, 'Đã đặt địa chỉ mặc định');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.delete('/addresses/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    return sendSuccess(res, null, 'Đã xóa địa chỉ');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 5. WISHLIST
router.get('/wishlist', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [products] = await pool.query<any[]>(
      `SELECT p.*,
        (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as thumbnail
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return sendSuccess(res, products);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/wishlist/:productId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const productId = parseInt(req.params.productId);

  try {
    const [existing] = await pool.query<any[]>('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);

    if (existing.length > 0) {
      await pool.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return sendSuccess(res, { inWishlist: false }, 'Đã xóa khỏi danh sách yêu thích');
    } else {
      await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [userId, productId]);
      return sendSuccess(res, { inWishlist: true }, 'Đã thêm vào danh sách yêu thích');
    }
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 6. LOYALTY POINTS
router.get('/loyalty', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [profile] = await pool.query<any[]>('SELECT tier, points FROM customer_profiles WHERE user_id = ?', [userId]);
    const [history] = await pool.query<any[]>(
      'SELECT * FROM loyalty_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      [userId]
    );
    return sendSuccess(res, {
      tier: profile[0]?.tier || 'bronze',
      points: profile[0]?.points || 0,
      history,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 7. SPECIAL DATES
router.get('/special-dates', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [dates] = await pool.query<any[]>('SELECT * FROM special_dates WHERE user_id = ? ORDER BY date ASC', [userId]);
    return sendSuccess(res, dates);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/special-dates', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { title, date, reminder_days, note } = req.body;
  if (!title || !date) return sendError(res, 'Vui lòng nhập tên sự kiện và ngày đặc biệt', 400);

  try {
    await pool.query(
      'INSERT INTO special_dates (user_id, title, date, reminder_days, note) VALUES (?, ?, ?, ?, ?)',
      [userId, title, date, reminder_days || 3, note || null]
    );
    return sendSuccess(res, null, 'Thêm ngày đặc biệt thành công! Klever Fruit sẽ nhắc bạn chọn quà chu đáo.', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.delete('/special-dates/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM special_dates WHERE id = ? AND user_id = ?', [id, userId]);
    return sendSuccess(res, null, 'Đã xóa ngày đặc biệt');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

export default router;
