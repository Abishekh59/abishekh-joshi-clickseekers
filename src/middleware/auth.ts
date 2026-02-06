import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  user_id: string; // <-- was number; align with the type TS expects in your app
  email: string;
  role: string;
}

// JWT payload can be slightly looser than req.user (e.g., user_id may come as string)
export interface AuthTokenPayload extends JwtPayload {
  user_id: number | string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser; // keep req.user consistent across the app
    }
  }
}

const isAuthTokenPayload = (v: unknown): v is AuthTokenPayload => {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  const id = obj.user_id;

  // Accept number OR any non-empty string (UUIDs, cuid, etc.)
  const idOk = typeof id === 'number' || (typeof id === 'string' && id.trim() !== '');

  return idOk && typeof obj.email === 'string' && typeof obj.role === 'string';
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAuthTokenPayload(decoded)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    const userId = typeof decoded.user_id === 'string' ? decoded.user_id : String(decoded.user_id);

    req.user = {
      user_id: userId, 
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};
