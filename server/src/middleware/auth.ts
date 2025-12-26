import { Request, Response, NextFunction } from 'express';
import { supabaseVerify } from '../supabase';

// Client to verify JWT
// const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey); // Removed in favor of centralized client

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  try {
    const { data: { user }, error } = await supabaseVerify.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
