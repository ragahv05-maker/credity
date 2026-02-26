
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { resolveError } from '../server/middleware/error-handler';
import { AppError, ERROR_CODES } from '../server/middleware/observability';

describe('resolveError', () => {
    it('should return the error as is if it is an instance of AppError', () => {
        const originalError = new AppError('Test Error', ERROR_CODES.INTERNAL, 500);
        const resolved = resolveError(originalError);
        expect(resolved).toBe(originalError);
    });

    it('should map ZodError to Validation Error', () => {
        const zodError = new ZodError([
            {
                code: 'invalid_type',
                expected: 'string',
                received: 'number',
                path: ['field'],
                message: 'Expected string, received number',
            },
        ]);
        const resolved = resolveError(zodError);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Validation Error');
        expect(resolved.code).toBe(ERROR_CODES.VALIDATION);
        expect(resolved.statusCode).toBe(400);
        // The implementation details structure is different in the actual code
        expect(resolved.details).toEqual({
            issues: [
                {
                    path: 'field',
                    message: 'Expected string, received number',
                    code: 'invalid_type',
                },
            ],
        });
    });

    it('should map SyntaxError with body to Bad Request', () => {
        const syntaxError = new SyntaxError('Unexpected token');
        (syntaxError as any).body = 'invalid json';
        const resolved = resolveError(syntaxError);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Invalid JSON payload');
        expect(resolved.code).toBe(ERROR_CODES.BAD_REQUEST);
        expect(resolved.statusCode).toBe(400);
    });

    it('should map unauthorized errors to Invalid or Expired Token', () => {
        const error = { name: 'UnauthorizedError' };
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Invalid or Expired Token');
        expect(resolved.code).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
        expect(resolved.statusCode).toBe(401);
    });

    it('should map jwt malformed errors to Invalid or Expired Token', () => {
        const error = { message: 'jwt malformed' };
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Invalid or Expired Token');
        expect(resolved.code).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
        expect(resolved.statusCode).toBe(401);
    });

    it('should map generic object errors to AppError with custom properties', () => {
        const error = { message: 'Custom Error', code: 'CUSTOM_CODE', status: 418 };
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Custom Error');
        expect(resolved.code).toBe('CUSTOM_CODE');
        expect(resolved.statusCode).toBe(418);
    });

     it('should map generic object errors with statusCode to AppError', () => {
        const error = { message: 'Custom Error', code: 'CUSTOM_CODE', statusCode: 418 };
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Custom Error');
        expect(resolved.code).toBe('CUSTOM_CODE');
        expect(resolved.statusCode).toBe(418);
    });


    it('should default generic object errors to 500 Internal Server Error', () => {
        const error = {};
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Internal Server Error');
        expect(resolved.code).toBe(ERROR_CODES.INTERNAL);
        expect(resolved.statusCode).toBe(500);
    });

    it('should handle null error', () => {
        const error = null;
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Internal Server Error');
        expect(resolved.code).toBe(ERROR_CODES.INTERNAL);
        expect(resolved.statusCode).toBe(500);
    });


    it('should map unknown string errors to 500 Internal Server Error', () => {
        const error = 'some string error';
        const resolved = resolveError(error);
        expect(resolved).toBeInstanceOf(AppError);
        expect(resolved.message).toBe('Internal Server Error');
        expect(resolved.code).toBe(ERROR_CODES.INTERNAL);
        expect(resolved.statusCode).toBe(500);
    });
});
