/**
 * API Validation & Error Handling Middleware
 *
 * - asyncHandler: wraps async route handlers to catch errors automatically
 * - validate: zod schema validation middleware for request body
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Wrap an async route handler so that rejected promises are forwarded
 * to Express's error handler instead of causing unhandled rejections.
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
): any {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware that validates `req.body` against a Zod schema.
 * Returns 400 with structured error messages on validation failure.
 */
export function validate(schema: ZodSchema): any {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
      next(err);
    }
  };
}
