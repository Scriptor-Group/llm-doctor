/**
 * Request Logger Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RequestLogger } from '../../core/stats/request-logger.js';
import { StatsManager } from '../../core/stats/stats-manager.js';

export function createRequestLoggerMiddleware(
  requestLogger: RequestLogger,
  statsManager: StatsManager
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = requestLogger.logRequest(
      req.path,
      req.method,
      req.body || {},
      req.headers
    );

    // Attach requestId to request for handlers to use
    (req as any).requestId = requestId;

    // Increment stats
    statsManager.incrementRequests();

    next();
  };
}
