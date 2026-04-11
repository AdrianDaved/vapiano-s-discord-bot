/**
 * Module augmentation for Express's Request — adds the `user` field that
 * `requireAuth` populates after JWT verification.
 *
 * Doing it this way (instead of a parallel `AuthRequest` interface) means
 * route handlers don't need a non-standard parameter type, middleware
 * composes via Express's normal `RequestHandler`, and we don't need
 * `as any` casts at every call site.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        avatar: string;
        accessToken: string;
      };
    }
  }
}

export {};
