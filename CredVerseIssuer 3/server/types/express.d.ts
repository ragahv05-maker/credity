// Global augmentations for Express
import { TokenPayload } from '../services/auth-service';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }

    interface User extends Partial<TokenPayload> {
      id?: string;
      userId: string;
      username: string;
      role: string;
      // email is optional in both TokenPayload and AuthUser (sometimes)
      email?: string;
      type?: 'access' | 'refresh';
    }
  }
}
