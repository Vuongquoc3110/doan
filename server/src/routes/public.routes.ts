import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ==========================================
// 1. PRODUCTS
// ==========================================
router.get('/products', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : null;
    const categorySlug = req.query.category_slug as string;
    const collectionSlug = req.query.collection_slug as string;
    const origin = req.query.origin as string;
    const priceRange = req.query.price_range as string; // 'under_500k', '500k_1m', '1m_2.5m', '2.5m_5m', 'above_5m'
    const search = req.query.search as string;
    const sort = (req.query.sort as string) || 'popular';

    const conditions: string[] = ["p.status = 'active'"];
    const params: any[] = [];

    if (req.query.is_gift === '1' || req.query.is_gift === '0') {
      conditions.push('p.is_gift = ?');
      params.push(Number(req.query.is_gift));
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    } else if (categorySlug) {
      conditions.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (collectionSlug) {
      conditions.push('col.slug = ?');
      params.push(collectionSlug);
    }

    if (origin && origin !== 'all') {
      conditions.push('p.origin LIKE ?');
      params.push(`%${origin}%`);
    }

    if (priceRange) {
      switch (priceRange) {
        case 'under_500k':
          conditions.push('p.base_price < 500000');
          break;
        case '500k_1m':
          conditions.push('p.base_price >= 500000 AND p.base_price <= 1000000');
          break;
        case '1m_2.5m':
          conditions.push('p.base_price > 1000000 AND p.base_price <= 2500000');
          break;
        case '2.5m_5m':
          conditions.push('p.base_price > 2500000 AND p.base_price <= 5000000');
          break;
        case 'above_5m':
          conditions.push('p.base_price > 5000000');
          break;
      }
    }

    if (search && search.trim()) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.origin LIKE ?)');
      const searchWildcard = `%${search.trim()}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    let orderBy = 'p.id DESC';
    if (sort === 'price_asc') orderBy = 'p.base_price ASC, p.id ASC';
    else if (sort === 'price_desc') orderBy = 'p.base_price DESC, p.id DESC';
    else if (sort === 'discount') orderBy = 'p.discount_percent DESC, p.id DESC';
    else if (sort === 'newest') orderBy = 'p.id DESC';
    else if (sort === 'oldest') orderBy = 'p.id ASC';
    else if (sort === 'name_asc') orderBy = 'p.name ASC, p.id ASC';
    else if (sort === 'name_desc') orderBy = 'p.name DESC, p.id DESC';
    else if (sort === 'popular') orderBy = "EXISTS (SELECT 1 FROM product_collections bpc JOIN collections bc ON bc.id = bpc.collection_id WHERE bpc.product_id = p.id AND bc.slug = 'best-seller') DESC, p.id DESC";

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const joinClause = `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      LEFT JOIN collections col ON pc.collection_id = col.id
    `;

    // Count total query
    const countSql = `SELECT COUNT(DISTINCT p.id) as total ${joinClause} ${whereClause}`;
    const [countRes] = await pool.query<any[]>(countSql, params);
    const total = countRes[0]?.total || 0;

    // Fetch products query
    const dataSql = `
      SELECT DISTINCT
        p.id, p.name, p.slug, p.description, p.origin,
        p.base_price, p.compare_price, p.discount_percent,
        p.category_id, p.is_gift, p.status, p.created_at,
        c.name as category_name, c.slug as category_slug,
        (SELECT label FROM product_variants WHERE product_id = p.id ORDER BY price ASC, id ASC LIMIT 1) as sale_label,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort ASC LIMIT 1) as thumbnail,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved'), 5) as rating_avg
      ${joinClause}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [products] = await pool.query<any[]>(dataSql, queryParams);

    return sendSuccess(res, products, 'Lấy danh sách sản phẩm thành công', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, `Lỗi tìm kiếm sản phẩm: ${err.message}`, 500);
  }
});

// Search suggestions autocomplete
router.get('/products/search-suggestions', async (req: Request, res: Response) => {
  const queryText = (req.query.q as string) || '';
  if (!queryText.trim()) {
    return sendSuccess(res, []);
  }

  try {
    const [suggestions] = await pool.query<any[]>(
      `SELECT id, name, slug, base_price,
        (SELECT url FROM product_images WHERE product_id = products.id LIMIT 1) as thumbnail
       FROM products
       WHERE status = 'active' AND name LIKE ?
       ORDER BY base_price DESC
       LIMIT 6`,
      [`%${queryText.trim()}%`]
    );
    return sendSuccess(res, suggestions);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// Product detail by ID or Slug
router.get('/products/:idOrSlug', async (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  try {
    const [products] = await pool.query<any[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}`,
      [isNumeric ? parseInt(idOrSlug) : idOrSlug]
    );

    if (products.length === 0) {
      return sendError(res, 'Sản phẩm không tồn tại', 404);
    }

    const product = products[0];

    // Variants
    const storeId = Number(req.query.store_id);
    const hasStore = Number.isSafeInteger(storeId) && storeId > 0;
    const [variants] = await pool.query<any[]>(
      `SELECT pv.id, pv.product_id, pv.label, pv.price, pv.sku,
       ${hasStore ? '(SELECT COALESCE(SUM(i.qty), 0) FROM inventory i WHERE i.variant_id = pv.id AND i.store_id = ?)' : 'NULL'} as stock
       FROM product_variants pv WHERE pv.product_id = ? ORDER BY pv.price ASC, pv.id ASC`,
      hasStore ? [storeId, product.id] : [product.id]
    );

    // Images
    const [images] = await pool.query<any[]>(
      'SELECT id, url, sort FROM product_images WHERE product_id = ? ORDER BY sort ASC',
      [product.id]
    );

    // Reviews
    const [reviews] = await pool.query<any[]>(
      `SELECT EXISTS(SELECT 1 FROM verified_reviews vr WHERE vr.review_id=r.id) as verified_buyer, r.id, r.rating, r.comment, r.created_at, u.full_name as user_name, u.avatar as user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'approved'
       ORDER BY r.id DESC LIMIT 10`,
      [product.id]
    );

    // Related products
    const [related] = await pool.query<any[]>(
      `SELECT p.id, p.name, p.slug, p.base_price, p.compare_price, p.discount_percent,
        (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as thumbnail
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'active'
       ORDER BY RAND() LIMIT 4`,
      [product.category_id, product.id]
    );

    return sendSuccess(res, {
      ...product,
      variants,
      images,
      reviews,
      related,
    }, 'Lấy thông tin chi tiết sản phẩm thành công');
  } catch (err: any) {
    return sendError(res, `Lỗi lấy chi tiết sản phẩm: ${err.message}`, 500);
  }
});

// ==========================================
// 2. CATEGORIES
// ==========================================
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const [categories] = await pool.query<any[]>(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
       GROUP BY c.id
       ORDER BY c.sort ASC, c.id ASC`
    );
    return sendSuccess(res, categories);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 3. COLLECTIONS
// ==========================================
router.get('/collections', async (_req: Request, res: Response) => {
  try {
    const [collections] = await pool.query<any[]>(
      `SELECT col.*, COUNT(pc.product_id) as product_count
       FROM collections col
       LEFT JOIN product_collections pc ON col.id = pc.collection_id
       GROUP BY col.id
       ORDER BY col.id ASC`
    );
    return sendSuccess(res, collections);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 4. STORES
// ==========================================
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : '';
    const district = typeof req.query.district === 'string' ? req.query.district : '';
    const [stores] = await pool.query<any[]>('SELECT * FROM stores WHERE is_active = 1 AND (? = ? OR city = ?) AND (? = ? OR district = ?) ORDER BY city DESC, id ASC', [city, '', city, district, '', district]);
    return sendSuccess(res, stores);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// Nearest stores by lat/lng
router.get('/stores/nearest', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return sendError(res, 'Vui lòng cung cấp tọa độ lat và lng hợp lệ', 400);
  }

  try {
    // Haversine formula query in kilometers
    const [stores] = await pool.query<any[]>(
      `SELECT *,
        ( 6371 * acos( cos( radians(?) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(?) ) + sin( radians(?) ) * sin( radians( lat ) ) ) ) AS distance_km
       FROM stores
       WHERE is_active = 1
       ORDER BY distance_km ASC
       LIMIT 5`,
      [lat, lng, lat]
    );

    return sendSuccess(res, stores, 'Tìm kiếm chi nhánh gần nhất thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 5. ARTICLES
// ==========================================
router.get('/articles', async (req: Request, res: Response) => {
  const type = req.query.type as string; // 'news' or 'video'
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const params: any[] = [];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRes] = await pool.query<any[]>(`SELECT COUNT(*) as total FROM articles ${where}`, params);
    const total = countRes[0]?.total || 0;

    const [articles] = await pool.query<any[]>(
      `SELECT id, type, title, slug, excerpt, cover, video_url, published_at
       FROM articles ${where}
       ORDER BY published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, articles, 'Lấy danh sách bài viết thành công', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.get('/articles/:idOrSlug', async (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  try {
    const [articles] = await pool.query<any[]>(
      `SELECT * FROM articles WHERE ${isNumeric ? 'id = ?' : 'slug = ?'}`,
      [isNumeric ? parseInt(idOrSlug) : idOrSlug]
    );

    if (articles.length === 0) {
      return sendError(res, 'Bài viết không tồn tại', 404);
    }

    return sendSuccess(res, articles[0]);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 6. BANNERS
// ==========================================
router.get('/banners', async (req: Request, res: Response) => {
  try {
    const [banners] = await pool.query<any[]>(
      'SELECT * FROM banners WHERE is_active = 1 AND (start_at IS NULL OR start_at<=NOW()) AND (end_at IS NULL OR end_at>NOW()) AND (? IS NULL OR placement=?) AND (? IS NULL OR platform="all" OR platform=?) ORDER BY sort ASC,id ASC',
      [req.query.placement||null,req.query.placement||null,req.query.platform||null,req.query.platform||null]
    );
    return sendSuccess(res, banners);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 7. COUPONS & GIFT CARDS CHECK
// ==========================================
router.get('/coupons', async (_req: Request, res: Response) => {
  try {
    const [coupons] = await pool.query<any[]>('SELECT code, type, value, min_order, expires_at FROM coupons WHERE expires_at > NOW() AND used < max_uses ORDER BY expires_at ASC');
    return sendSuccess(res, coupons);
  } catch (err: any) { return sendError(res, err.message, 500); }
});

router.post('/coupons/check', async (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;
  if (!code) return sendError(res, 'Vui lòng nhập mã giảm giá', 400);

  try {
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM coupons WHERE code = ? AND expires_at > NOW() AND used < max_uses',
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return sendError(res, 'Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng', 404);
    }

    const coupon = rows[0];
    const subtotal = Number(orderAmount) || 0;

    if (subtotal < coupon.min_order) {
      return sendError(res, `Đơn hàng tối thiểu để áp dụng mã là ${coupon.min_order.toLocaleString('vi-VN')}₫`, 400);
    }

    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.floor((subtotal * coupon.value) / 100);
    } else {
      discountAmount = coupon.value;
    }

    return sendSuccess(res, {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
    }, 'Áp dụng mã giảm giá thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/gift-cards/check', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return sendError(res, 'Vui lòng nhập mã Gift Card', 400);

  try {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM gift_cards WHERE code = ? AND status = 'active' AND expires_at > NOW() AND balance > 0",
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return sendError(res, 'Mã Gift Card không hợp lệ hoặc số dư bằng 0', 404);
    }

    const card = rows[0];
    return sendSuccess(res, {
      code: card.code,
      balance: card.balance,
      expiresAt: card.expires_at,
    }, 'Kiểm tra Gift Card thành công');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

// ==========================================
// 8. JOBS & FEEDBACK
// ==========================================
router.get('/job-posts', async (_req: Request, res: Response) => {
  try {
    const [jobs] = await pool.query<any[]>("SELECT * FROM job_posts WHERE status = 'open' ORDER BY id DESC");
    return sendSuccess(res, jobs);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/job-applications', async (req: Request, res: Response) => {
  const { job_id, full_name, phone, email, note } = req.body;
  if (!job_id || !full_name || !phone || !email) {
    return sendError(res, 'Vui lòng điền đầy đủ các thông tin bắt buộc', 400);
  }

  try {
    await pool.query(
      'INSERT INTO job_applications (job_id, full_name, phone, email, note) VALUES (?, ?, ?, ?, ?)',
      [job_id, full_name, phone, email, note || null]
    );
    return sendSuccess(res, null, 'Nộp hồ sơ ứng tuyển thành công! Phòng nhân sự Klever Fruit sẽ liên hệ bạn sớm nhất.', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

router.post('/feedback', async (req: Request, res: Response) => {
  const { name, phone, email, content } = req.body;
  if (!name || !phone || !content) {
    return sendError(res, 'Vui lòng nhập họ tên, số điện thoại và nội dung góp ý', 400);
  }

  try {
    await pool.query(
      'INSERT INTO feedbacks (name, phone, email, content) VALUES (?, ?, ?, ?)',
      [name, phone, email || null, content]
    );
    return sendSuccess(res, null, 'Cảm ơn quý khách đã gửi góp ý đến Klever Fruit!', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

export default router;
