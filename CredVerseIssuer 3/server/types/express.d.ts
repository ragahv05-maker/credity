import { TokenPayload } from "../services/auth-service";

declare global {
  namespace Express {
    // Extend the interface used by Passport
    interface User extends TokenPayload {
        id?: string;
    }

    interface Request {
      tenantId?: string;
    }
  }
}
