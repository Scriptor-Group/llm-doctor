/**
 * Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { StatsManager } from '../../core/stats/stats-manager.js';

export function createErrorHandlerMiddleware(statsManager: StatsManager) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    statsManager.incrementStat('errors');

    res.status(500).json({
      error: {
        message: err.message || 'Internal server error',
        type: 'internal_error'
      }
    });
  };
}
