import { TokenPayload } from '../services/auth-service';

declare global {
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface User extends Omit<TokenPayload, 'type'> {
            type?: 'access' | 'refresh';
        }
    }
}
