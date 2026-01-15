import { Router, Request, Response } from 'express';
import { AlertsService } from '../services/AlertsService';
import { requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../permissions/definitions';
import logger from '../utils/logger';

export function createAlertsRoutes(alertsService: AlertsService): Router {
  const router = Router();

  /**
   * GET /api/alerts
   * Get all alerts across all servers
   */
  router.get('/', requirePermission(PERMISSIONS.ALERTS_VIEW), async (req: Request, res: Response) => {
    try {
      const { unreadOnly, unresolvedOnly, limit } = req.query;

      // Get alerts for all servers (pass undefined for serverId)
      const alerts = await alertsService.getAlerts(undefined, {
        unreadOnly: unreadOnly === 'true',
        unresolvedOnly: unresolvedOnly === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(alerts);
    } catch (error: any) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({ error: error.message || 'Failed to get alerts' });
    }
  });

  /**
   * GET /api/alerts/unread-count
   * Get unread alert count across all servers
   */
  router.get('/unread-count', requirePermission(PERMISSIONS.ALERTS_VIEW), async (_req: Request, res: Response) => {
    try {
      // Get unread count for all servers (pass undefined for serverId)
      const count = await alertsService.getUnreadCount(undefined);
      res.json({ count });
    } catch (error: any) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({ error: error.message || 'Failed to get unread count' });
    }
  });

  /**
   * PUT /api/alerts/read-all
   * Mark all alerts as read across all servers
   */
  router.put('/read-all', requirePermission(PERMISSIONS.ALERTS_MANAGE), async (_req: Request, res: Response) => {
    try {
      await alertsService.markAllAsRead();
      res.json({ message: 'All alerts marked as read' });
    } catch (error: any) {
      logger.error('Error marking all alerts as read:', error);
      res.status(500).json({ error: error.message || 'Failed to mark alerts as read' });
    }
  });

  return router;
}
