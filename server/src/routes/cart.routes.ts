import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { optionalAuth } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Helper to get or create cart
async function getOrCreateCart(userId?: number, sessionId?: string): Promise<number> {
  if (userId) {
    const [userCarts] = await pool.query<any[]>(
      'SELECT id FROM carts WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if (userCarts.length > 0) return userCarts[0].id;

    const [res]: any = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    return res.insertId;
  }

  const sid = sessionId || 'guest_' + Math.random().toString(36).substring(2);
  const [guestCarts] = await pool.query<any[]>(
    'SELECT id FROM carts WHERE session_id = ? ORDER BY id DESC LIMIT 1',
    [sid]
  );
  if (guestCarts.length > 0) return guestCarts[0].id;

  const [res]: any = await pool.query('INSERT INTO carts (session_id) VALUES (?)', [sid]);
  return res.insertId;
}

// 1. GET CART
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers['x-session-id'] as string;

  try {
    const cartId = await getOrCreateCart(userId, sessionId);

    const [items] = await pool.query<any[]>(
      `SELECT ci.id, ci.cart_id, ci.variant_id, ci.qty,
              pv.label as variant_label, pv.price as unit_price, pv.sku,
              p.id as product_id, p.name as product_name, p.origin,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort ASC LIMIT 1) as thumbnail
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE ci.cart_id = ?
       ORDER BY ci.id DESC`,
      [cartId]
    );

    const subtotal = items.reduce((sum, it) => sum + (Number(it.unit_price) * it.qty), 0);
    const totalItems = items.reduce((sum, it) => sum + it.qty, 0);

    return sendSuccess(res, {
      cartId,
      items,
      subtotal,
      totalItems,
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 2. ADD TO CART
router.post('/items', optionalAuth, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers['x-session-id'] as string;
  const { variantId, qty = 1 } = req.body;

  if (!variantId || qty <= 0) {
    return sendError(res, 'Thông tin sản phẩm hoặc số lượng không hợp lệ', 400);
  }

  try {
    const cartId = await getOrCreateCart(userId, sessionId);

    // Check if variant already exists in cart
    const [existing] = await pool.query<any[]>(
      'SELECT id, qty FROM cart_items WHERE cart_id = ? AND variant_id = ?',
      [cartId, variantId]
    );

    if (existing.length > 0) {
      const newQty = existing[0].qty + Number(qty);
      await pool.query('UPDATE cart_items SET qty = ? WHERE id = ?', [newQty, existing[0].id]);
    } else {
      await pool.query('INSERT INTO cart_items (cart_id, variant_id, qty) VALUES (?, ?, ?)', [
        cartId,
        variantId,
        qty,
      ]);
    }

    return sendSuccess(res, { cartId }, 'Đã thêm sản phẩm vào giỏ hàng');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 3. UPDATE ITEM QTY
router.put('/items/:id', optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { qty } = req.body;

  try {
    if (Number(qty) <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id = ?', [id]);
      return sendSuccess(res, null, 'Đã xóa sản phẩm khỏi giỏ hàng');
    }

    await pool.query('UPDATE cart_items SET qty = ? WHERE id = ?', [qty, id]);
    return sendSuccess(res, null, 'Cập nhật số lượng thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 4. REMOVE ITEM
router.delete('/items/:id', optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ?', [id]);
    return sendSuccess(res, null, 'Đã xóa sản phẩm khỏi giỏ hàng');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// 5. CLEAR CART
router.delete('/', optionalAuth, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers['x-session-id'] as string;

  try {
    const cartId = await getOrCreateCart(userId, sessionId);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    return sendSuccess(res, null, 'Đã làm trống giỏ hàng');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

export default router;
