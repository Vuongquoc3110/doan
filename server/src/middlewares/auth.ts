import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import pool from '../db/connection';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Yêu cầu đăng nhập để thực hiện thao tác này', 401);
  }

  const token = authHeader.split(' ')[1];
  let payload:TokenPayload;
  try {payload=verifyAccessToken(token);} catch {
    return sendError(res, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ', 401);
  }
  try{
    const [users]=await pool.query<any[]>('SELECT u.role,u.status,u.full_name,sp.store_id FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id WHERE u.id=?',[payload.userId]);
    if(!users.length||users[0].status!=='active')return sendError(res,'Tài khoản không còn hoạt động',401);
    req.user={...payload,role:users[0].role,fullName:users[0].full_name,storeId:users[0].store_id||undefined};
    next();
  }catch(err){next(err);}
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req,_res,next);
  }
  next();
}

export function requireRole(...allowedRoles: Array<'customer' | 'staff' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Chưa xác thực người dùng', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Quyền truy cập bị từ chối. Chức năng chỉ dành cho: ${allowedRoles.join(', ')}`,
        403
      );
    }

    next();
  };
}

export async function attachStaffStore(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 'Chưa xác thực người dùng', 401);
  }

  if (req.user.role === 'staff') {
    if (!req.user.storeId) {
      const [rows] = await pool.query<any[]>(
        'SELECT store_id FROM staff_profiles WHERE user_id = ?',
        [req.user.userId]
      );
      if (rows.length > 0) {
        req.user.storeId = rows[0].store_id;
      } else {
        return sendError(res, 'Nhân viên chưa được phân công chi nhánh cửa hàng', 403);
      }
    }
  }
  next();
}
