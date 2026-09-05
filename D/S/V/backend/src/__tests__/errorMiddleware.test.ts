import { errorHandler, notFound } from '../middleware/error';
import { createMockRequest, createMockResponse, createMockNext } from './helpers';

describe('Error Middleware', () => {
  describe('errorHandler', () => {
    it('should return 500 with error message', () => {
      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 200 });
      const next = createMockNext();

      const error = new Error('Something went wrong');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Something went wrong',
      }));
    });

    it('should handle Zod validation errors', () => {
      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 200 });
      const next = createMockNext();

      const zodError = new Error('Validation error');
      (zodError as any).name = 'ZodError';
      (zodError as any).issues = [
        { path: ['email'], message: 'Invalid email' },
        { path: ['age'], message: 'Must be 18+' },
      ];
      errorHandler(zodError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation error',
      }));
    });

    it('should handle Prisma known request errors', () => {
      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 200 });
      const next = createMockNext();

      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).name = 'PrismaClientKnownRequestError';
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['email'] };
      errorHandler(prismaError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unique constraint failed',
      }));
    });

    it('should log the error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 200 });
      const next = createMockNext();

      const error = new Error('Dev error');
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Dev error',
        stack: expect.any(String),
      }));

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle string errors', () => {
      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 200 });
      const next = createMockNext();

      errorHandler(new Error('string error'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFound', () => {
    it('should return 404', () => {
      const req = createMockRequest({ path: '/nonexistent' });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Route not found',
      }));
    });
  });
});
