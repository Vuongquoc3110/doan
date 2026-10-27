import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccess, sendError } from '../utils/response';
import { optionalAuth } from '../middlewares/auth';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'klever-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận tệp định dạng hình ảnh (jpg, png, webp, gif)'));
    }
  },
});

router.post('/image', optionalAuth, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'Vui lòng chọn hình ảnh để tải lên', 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return sendSuccess(res, {
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  }, 'Tải ảnh lên thành công', 201);
});

router.post('/images', optionalAuth, upload.array('images', 5), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return sendError(res, 'Vui lòng chọn ít nhất một hình ảnh', 400);
  }

  const urls = files.map((f) => `/uploads/${f.filename}`);
  return sendSuccess(res, { urls }, 'Tải các ảnh lên thành công', 201);
});

export default router;
