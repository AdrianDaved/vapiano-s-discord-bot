/**
 * API validation & error-handling middleware.
 *
 * - asyncHandler: wraps async route handlers so a rejected promise becomes
 *   an Express error instead of an unhandled rejection.
 * - validate: parses `req.body` against a Zod schema and replaces it with
 *   the parsed (stripped) result. 400 with structured details on failure.
 *
 * Both helpers are typed as `RequestHandler` so callers don't need `as any`
 * casts at the use site.
 */
import { RequestHandler, Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validate(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ error: 'Validation failed', details });
        return;
      }
      next(err);
    }
  };
}
