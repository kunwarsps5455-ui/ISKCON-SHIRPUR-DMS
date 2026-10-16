import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { prisma } from '../db.js';

export const logAudit = (action: string, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // We hook into the response finish event to capture the result
    res.on('finish', async () => {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Read entityId from params or response locals
        const entityId = req.params.id || res.locals.entityId || 'system';
        
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || 'system',
              userName: req.user?.name || 'System',
              userRole: req.user?.role || 'SYSTEM',
              action,
              entityType,
              entityId,
              newData: res.locals.auditNewData ? JSON.stringify(res.locals.auditNewData) : null,
              oldData: res.locals.auditOldData ? JSON.stringify(res.locals.auditOldData) : null,
              metadata: JSON.stringify({
                ip: req.ip,
                method: req.method,
                path: req.path
              })
            }
          });
        } catch (error) {
          console.error('Failed to write audit log:', error);
        }
      }
    });
    next();
  };
};
