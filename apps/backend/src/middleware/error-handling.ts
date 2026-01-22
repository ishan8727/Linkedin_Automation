import { Request, Response, NextFunction } from 'express';

/**
 * Standard error response format per API Contracts
 */
export interface ApiError {
  errorCode: string;
  message: string;
}

/**
 * Standard error response middleware
 * 
 * Formats errors according to API Contracts document.
 * Common error codes: UNAUTHORIZED, FORBIDDEN, RESOURCE_NOT_FOUND,
 * INVALID_STATE, RATE_LIMITED, RISK_PAUSED, SESSION_INVALID
 */
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If it's already an ApiError, use it directly
  if ('errorCode' in err) {
    res.status(getStatusCode(err.errorCode)).json(err);
    return;
  }

  // Otherwise, format as internal error
  console.error('Unhandled error:', err);
  res.status(500).json({
    errorCode: 'INTERNAL_ERROR',
    message: 'An internal error occurred'
  });
};

/**
 * Maps error codes to HTTP status codes
 */
function getStatusCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    RESOURCE_NOT_FOUND: 404,
    INVALID_STATE: 400,
    RATE_LIMITED: 429,
    RISK_PAUSED: 503,
    SESSION_INVALID: 401,
    INTERNAL_ERROR: 500
  };

  return statusMap[errorCode] || 500;
}

