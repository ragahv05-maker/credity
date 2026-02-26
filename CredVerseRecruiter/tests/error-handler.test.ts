import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { resolveError } from '../server/middleware/error-handler';
import { AppError, ERROR_CODES } from '../server/middleware/observability';

describe('resolveError', () => {
  it('should return the error as is if it is an instance of AppError', () => {
    const error = new AppError('Test Error', 'TEST_ERROR', 400);
    const result = resolveError(error);
    expect(result).toBe(error);
  });

  it('should return a Validation Error if it is an instance of ZodError', () => {
    const error = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Validation Error');
    expect(result.code).toBe(ERROR_CODES.VALIDATION);
    expect(result.statusCode).toBe(400);
    expect(result.details).toEqual({
      issues: [
        {
          path: 'name',
          message: 'Expected string, received number',
          code: 'invalid_type',
        },
      ],
    });
  });

  it('should return a Bad Request Error if it is a SyntaxError with body property', () => {
    const error = new SyntaxError('Unexpected token');
    (error as any).body = 'invalid json';
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Invalid JSON payload');
    expect(result.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(result.statusCode).toBe(400);
  });

  it('should return an Invalid Token Error for UnauthorizedError', () => {
    const error = { name: 'UnauthorizedError' };
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Invalid or Expired Token');
    expect(result.code).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
    expect(result.statusCode).toBe(401);
  });

  it('should return an Invalid Token Error for jwt malformed', () => {
    const error = { message: 'jwt malformed' };
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Invalid or Expired Token');
    expect(result.code).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
    expect(result.statusCode).toBe(401);
  });

  it('should return an AppError with properties from a generic object error', () => {
    const error = { message: 'Custom Error', code: 'CUSTOM_CODE', status: 418 };
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Custom Error');
    expect(result.code).toBe('CUSTOM_CODE');
    expect(result.statusCode).toBe(418);
  });

  it('should use statusCode property if status is missing in generic object error', () => {
    const error = { message: 'Custom Error', statusCode: 418 };
    const result = resolveError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(418);
  });

  it('should return Internal Server Error for unknown errors', () => {
    const error = 'Something went wrong';
    const result = resolveError(error); // String is not an object (typeof string)
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Internal Server Error');
    expect(result.code).toBe(ERROR_CODES.INTERNAL);
    expect(result.statusCode).toBe(500);
  });

  it('should return Internal Server Error for null error', () => {
      const error = null;
      const result = resolveError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Internal Server Error');
      expect(result.code).toBe(ERROR_CODES.INTERNAL);
      expect(result.statusCode).toBe(500);
  });
});
