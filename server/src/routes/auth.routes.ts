import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/connection';
import { validate } from '../middlewares/validate';
import {
  comparePassword,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// In-memory OTP storage for simulated SMS verification
const otpStore = new Map<string, { otp: string; expiresAt: number; token?: string }>();

// 1. LOGIN
const loginSchema = z.object({
  // Keep the existing request field for mobile clients, accepting either identifier.
  phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại hoặc email')
    .max(254, 'Số điện thoại hoặc email quá dài')
    .refine(value => /^\+?\d{9,15}$/.test(value) || z.string().email().safeParse(value).success, 'Vui lòng nhập số điện thoại hoặc email hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  try {
    const emailLogin = phone.includes('@');
    const [users] = await pool.query<any[]>(
      `SELECT id, phone, email, password_hash, full_name, role, avatar, status FROM users WHERE ${emailLogin ? 'LOWER(email)' : 'phone'} = ? LIMIT 2`,
      [emailLogin ? phone.toLowerCase() : phone]
    );

    if (users.length !== 1) {
      return sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
    }

    const user = users[0];

    if (user.status === 'blocked') {
      return sendError(res, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hotline 1900 63 38 83', 403);
    }

    const isMatch = comparePassword(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
    }

    let extraInfo: any = {};
    if (user.role === 'customer') {
      const [profile] = await pool.query<any[]>(
        'SELECT tier, points FROM customer_profiles WHERE user_id = ?',
        [user.id]
      );
      extraInfo = profile[0] || { tier: 'bronze', points: 0 };
    } else if (user.role === 'staff') {
      const [staff] = await pool.query<any[]>(
        `SELECT sp.store_id, sp.position, s.name as store_name, s.address as store_address
         FROM staff_profiles sp
         LEFT JOIN stores s ON sp.store_id = s.id
         WHERE sp.user_id = ?`,
        [user.id]
      );
      extraInfo = staff[0] || { store_id: 1, position: 'Nhân viên bán hàng' };
    }

    const tokenPayload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      fullName: user.full_name,
      storeId: extraInfo.store_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return sendSuccess(res, {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        ...extraInfo,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      portal: `(${user.role})`,
    }, 'Đăng nhập thành công');
  } catch (err: any) {
    return sendError(res, `Lỗi đăng nhập: ${err.message}`, 500);
  }
});

// 2. REGISTER (Default role: customer)
const registerSchema = z.object({
  phone: z.string().min(9, 'Số điện thoại phải từ 9 - 11 chữ số').max(15),
  fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  const { phone, fullName, password, email } = req.body;

  try {
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return sendError(res, 'Số điện thoại này đã được đăng ký', 409);
    }

    const hashedPassword = hashPassword(password);
    const [result]: any = await pool.query(
      'INSERT INTO users (phone, email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [phone, email || null, hashedPassword, fullName, 'customer', 'active']
    );

    const newUserId = result.insertId;

    // Create customer profile
    await pool.query(
      'INSERT INTO customer_profiles (user_id, tier, points) VALUES (?, ?, ?)',
      [newUserId, 'bronze', 100] // Tặng 100 điểm khởi tạo
    );

    const tokenPayload = {
      userId: newUserId,
      phone,
      role: 'customer' as const,
      fullName,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return sendSuccess(res, {
      user: {
        id: newUserId,
        phone,
        email: email || null,
        fullName,
        role: 'customer',
        tier: 'bronze',
        points: 100,
        status: 'active',
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      portal: '(customer)',
    }, 'Đăng ký tài khoản thành công! Bạn nhận được 100 điểm thưởng chào mừng.', 201);
  } catch (err: any) {
    return sendError(res, `Lỗi đăng ký: ${err.message}`, 500);
  }
});

// 3. REFRESH TOKEN
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const [users] = await pool.query<any[]>(
      'SELECT id, phone, role, full_name, status FROM users WHERE id = ?',
      [payload.userId]
    );

    if (users.length === 0 || users[0].status === 'blocked') {
      return sendError(res, 'Tài khoản không tồn tại hoặc đã bị khóa', 401);
    }

    const user = users[0];
    const newAccessToken = generateAccessToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      fullName: user.full_name,
      storeId: payload.storeId,
    });

    return sendSuccess(res, {
      accessToken: newAccessToken,
    }, 'Cấp mới access token thành công');
  } catch (err: any) {
    return sendError(res, 'Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }
});

// 4. FORGOT PASSWORD (SIMULATE SMS OTP)
const forgotPasswordSchema = z.object({
  phone: z.string().min(9).max(15),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  const { phone } = req.body;

  const [users] = await pool.query<any[]>('SELECT id, full_name FROM users WHERE phone = ?', [phone]);
  if (users.length === 0) {
    return sendError(res, 'Số điện thoại này chưa được đăng ký trong hệ thống', 404);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { otp, expiresAt });

  // PRINT SIMULATED OTP TO SERVER CONSOLE AS REQUESTED
  console.log('\n========================================================');
  console.log(`📱 [OTP SIMULATOR] Mã OTP cấp cho SĐT ${phone}: >>> ${otp} <<<`);
  console.log('Hết hạn sau 5 phút.');
  console.log('========================================================\n');

  return sendSuccess(res, {
    phone,
    expiresInSeconds: 300,
    devOtpNote: `(Dev Mode: Mã OTP là ${otp})`,
  }, 'Mã xác thực OTP đã được gửi đến số điện thoại của bạn');
});

// 5. VERIFY OTP
const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(15),
  otp: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
});

router.post('/verify-otp', validate(verifyOtpSchema), async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const stored = otpStore.get(phone);

  if (!stored) {
    return sendError(res, 'Vui lòng yêu cầu gửi mã OTP trước', 400);
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return sendError(res, 'Mã OTP đã hết hạn, vui lòng yêu cầu mã mới', 400);
  }

  if (stored.otp !== otp) {
    return sendError(res, 'Mã OTP không chính xác', 400);
  }

  // Generate temporary reset token
  const resetToken = 'reset_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  stored.token = resetToken;
  otpStore.set(phone, stored);

  return sendSuccess(res, {
    resetToken,
  }, 'Xác thực OTP thành công! Vui lòng đặt mật khẩu mới');
});

// 6. RESET PASSWORD
const resetPasswordSchema = z.object({
  phone: z.string().min(9).max(15),
  resetToken: z.string().min(1),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response) => {
  const { phone, resetToken, newPassword } = req.body;
  const stored = otpStore.get(phone);

  if (!stored || stored.token !== resetToken) {
    return sendError(res, 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);
  }

  const hashedPassword = hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash = ? WHERE phone = ?', [hashedPassword, phone]);
  otpStore.delete(phone);

  return sendSuccess(res, null, 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay');
});

export default router;
