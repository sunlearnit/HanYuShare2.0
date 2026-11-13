import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Vui lòng đăng nhập Google để đồng bộ dữ liệu.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
};
