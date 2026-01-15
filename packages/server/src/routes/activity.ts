import { Router, Request, Response } from 'express';
import { ActivityLogService, ActivityLogFilters, PaginationOptions } from '../services/ActivityLogService';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../permissions/definitions';
import logger from '../utils/logger';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

/**
 * GET /api/activity
 * Query activity logs with filtering and pagination
 */
router.get('/', requirePermission(PERMISSIONS.ACTIVITY_VIEW), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    // Parse filters from query params
    const filters: ActivityLogFilters = {};

    if (req.query.userId && typeof req.query.userId === 'string') {
      filters.userId = req.query.userId;
    }

    if (req.query.action && typeof req.query.action === 'string') {
      filters.action = req.query.action;
    }

    if (req.query.actionCategory && typeof req.query.actionCategory === 'string') {
      filters.actionCategory = req.query.actionCategory;
    }

    if (req.query.resourceType && typeof req.query.resourceType === 'string') {
      filters.resourceType = req.query.resourceType;
    }

    if (req.query.resourceId && typeof req.query.resourceId === 'string') {
      filters.resourceId = req.query.resourceId;
    }

    if (req.query.status && typeof req.query.status === 'string') {
      filters.status = req.query.status as 'success' | 'failed';
    }

    if (req.query.startDate && typeof req.query.startDate === 'string') {
      filters.startDate = new Date(req.query.startDate);
    }

    if (req.query.endDate && typeof req.query.endDate === 'string') {
      filters.endDate = new Date(req.query.endDate);
    }

    if (req.query.search && typeof req.query.search === 'string') {
      filters.search = req.query.search;
    }

    // Parse pagination from query params
    const pagination: PaginationOptions = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // Max 100 per page
      sortBy: (req.query.sortBy as 'timestamp' | 'action' | 'username') || 'timestamp',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await activityLogService.query(filters, pagination);

    res.json(result);
  } catch (error: any) {
    logger.error('Error querying activity logs:', error);
    res.status(500).json({ message: 'Failed to query activity logs', error: error.message });
  }
});

/**
 * GET /api/activity/recent
 * Get recent activity (for dashboard)
 */
router.get('/recent', requirePermission(PERMISSIONS.ACTIVITY_VIEW), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const activities = await activityLogService.getRecentActivity(limit);

    res.json(activities);
  } catch (error: any) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity', error: error.message });
  }
});

/**
 * GET /api/activity/stats
 * Get activity statistics
 */
router.get('/stats', requirePermission(PERMISSIONS.ACTIVITY_VIEW), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate && typeof req.query.startDate === 'string') {
      startDate = new Date(req.query.startDate);
    }

    if (req.query.endDate && typeof req.query.endDate === 'string') {
      endDate = new Date(req.query.endDate);
    }

    const stats = await activityLogService.getStats(startDate, endDate);

    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching activity stats:', error);
    res.status(500).json({ message: 'Failed to fetch activity stats', error: error.message });
  }
});

/**
 * GET /api/activity/server/:serverId
 * Get activity for a specific server
 */
router.get('/server/:serverId', requirePermission(PERMISSIONS.ACTIVITY_VIEW), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    const { serverId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const activities = await activityLogService.getServerActivity(serverId, limit);

    res.json(activities);
  } catch (error: any) {
    logger.error('Error fetching server activity:', error);
    res.status(500).json({ message: 'Failed to fetch server activity', error: error.message });
  }
});

/**
 * GET /api/activity/user/:userId
 * Get activity for a specific user
 */
router.get('/user/:userId', requirePermission(PERMISSIONS.ACTIVITY_VIEW_ALL), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const activities = await activityLogService.getUserActivity(userId, limit);

    res.json(activities);
  } catch (error: any) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Failed to fetch user activity', error: error.message });
  }
});

/**
 * GET /api/activity/:id
 * Get a single activity log entry
 */
router.get('/:id', requirePermission(PERMISSIONS.ACTIVITY_VIEW), async (req: Request, res: Response) => {
  try {
    const activityLogService: ActivityLogService = req.app.get('activityLogService');

    const activity = await activityLogService.getById(req.params.id);

    if (!activity) {
      res.status(404).json({ message: 'Activity log entry not found' });
      return;
    }

    res.json(activity);
  } catch (error: any) {
    logger.error('Error fetching activity log entry:', error);
    res.status(500).json({ message: 'Failed to fetch activity log entry', error: error.message });
  }
});

export default router;
