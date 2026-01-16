import { Router, Request, Response } from 'express';
import { TaskGroupService } from '../services/TaskGroupService';
import { requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS } from '../permissions/definitions';
import { ActivityLogService } from '../services/ActivityLogService';
import { ACTIVITY_ACTIONS, RESOURCE_TYPES } from '../constants/ActivityLogActions';
import { getActivityContext } from '../middleware/activityLogger';
import logger from '../utils/logger';

export function createTaskGroupRoutes(taskGroupService: TaskGroupService): Router {
  const router = Router();

  // ============================================
  // Task Group CRUD
  // ============================================

  /**
   * GET /api/task-groups
   * Get all task groups
   */
  router.get('/', requirePermission(PERMISSIONS.SERVERS_VIEW), async (_req: Request, res: Response) => {
    try {
      const groups = await taskGroupService.getAllGroups();
      res.json(groups);
    } catch (error) {
      logger.error('Error getting task groups:', error);
      res.status(500).json({ error: 'Failed to get task groups' });
    }
  });

  /**
   * GET /api/task-groups/:id
   * Get a single task group
   */
  router.get('/:id', requirePermission(PERMISSIONS.SERVERS_VIEW), async (req: Request, res: Response) => {
    try {
      const group = await taskGroupService.getGroupWithTasks(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Task group not found' });
      }
      return res.json(group);
    } catch (error) {
      logger.error('Error getting task group:', error);
      return res.status(500).json({ error: 'Failed to get task group' });
    }
  });

  /**
   * POST /api/task-groups
   * Create a new task group
   */
  router.post('/', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { name, description, cronExpression, failureMode, delayBetweenTasks, enabled, taskIds } = req.body;

      if (!name || !cronExpression) {
        return res.status(400).json({ error: 'Name and cronExpression are required' });
      }

      const group = await taskGroupService.createGroup({
        name,
        description,
        cronExpression,
        failureMode,
        delayBetweenTasks,
        enabled,
        taskIds,
      });

      // Log activity
      await ActivityLogService.log({
        ...getActivityContext(authReq),
        action: ACTIVITY_ACTIONS.TASK_GROUP_CREATE,
        actionCategory: 'automation',
        resourceType: RESOURCE_TYPES.TASK_GROUP,
        resourceId: group.id,
        resourceName: group.name,
        status: 'success',
      });

      return res.status(201).json(group);
    } catch (error: any) {
      logger.error('Error creating task group:', error);
      return res.status(500).json({ error: error.message || 'Failed to create task group' });
    }
  });

  /**
   * PATCH /api/task-groups/:id
   * Update a task group
   */
  router.patch('/:id', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const group = await taskGroupService.updateGroup(req.params.id, req.body);

      // Log activity
      await ActivityLogService.log({
        ...getActivityContext(authReq),
        action: ACTIVITY_ACTIONS.TASK_GROUP_UPDATE,
        actionCategory: 'automation',
        resourceType: RESOURCE_TYPES.TASK_GROUP,
        resourceId: group.id,
        resourceName: group.name,
        status: 'success',
      });

      res.json(group);
    } catch (error: any) {
      logger.error('Error updating task group:', error);
      res.status(500).json({ error: error.message || 'Failed to update task group' });
    }
  });

  /**
   * DELETE /api/task-groups/:id
   * Delete a task group
   */
  router.delete('/:id', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      // Get group info before deletion for logging
      const group = await taskGroupService.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Task group not found' });
      }

      await taskGroupService.deleteGroup(req.params.id);

      // Log activity
      await ActivityLogService.log({
        ...getActivityContext(authReq),
        action: ACTIVITY_ACTIONS.TASK_GROUP_DELETE,
        actionCategory: 'automation',
        resourceType: RESOURCE_TYPES.TASK_GROUP,
        resourceId: req.params.id,
        resourceName: group.name,
        status: 'success',
      });

      return res.status(204).send();
    } catch (error) {
      logger.error('Error deleting task group:', error);
      return res.status(500).json({ error: 'Failed to delete task group' });
    }
  });

  // ============================================
  // Task Group Actions
  // ============================================

  /**
   * POST /api/task-groups/:id/toggle
   * Toggle group enabled/disabled
   */
  router.post('/:id/toggle', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { enabled } = req.body;
      const group = await taskGroupService.toggleGroup(req.params.id, enabled);

      // Log activity
      await ActivityLogService.log({
        ...getActivityContext(authReq),
        action: enabled ? ACTIVITY_ACTIONS.TASK_GROUP_ENABLE : ACTIVITY_ACTIONS.TASK_GROUP_DISABLE,
        actionCategory: 'automation',
        resourceType: RESOURCE_TYPES.TASK_GROUP,
        resourceId: group.id,
        resourceName: group.name,
        status: 'success',
      });

      res.json(group);
    } catch (error: any) {
      logger.error('Error toggling task group:', error);
      res.status(500).json({ error: error.message || 'Failed to toggle task group' });
    }
  });

  /**
   * POST /api/task-groups/:id/run
   * Run task group immediately
   */
  router.post('/:id/run', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const group = await taskGroupService.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Task group not found' });
      }

      const execution = await taskGroupService.executeGroup(req.params.id);

      // Log activity
      await ActivityLogService.log({
        ...getActivityContext(authReq),
        action: ACTIVITY_ACTIONS.TASK_GROUP_RUN,
        actionCategory: 'automation',
        resourceType: RESOURCE_TYPES.TASK_GROUP,
        resourceId: group.id,
        resourceName: group.name,
        status: execution.status === 'failed' ? 'failed' : 'success',
        details: JSON.stringify({ executionId: execution.id, status: execution.status }),
      });

      return res.json(execution);
    } catch (error: any) {
      logger.error('Error running task group:', error);
      return res.status(500).json({ error: error.message || 'Failed to run task group' });
    }
  });

  /**
   * GET /api/task-groups/:id/executions
   * Get execution history for a group
   */
  router.get('/:id/executions', requirePermission(PERMISSIONS.SERVERS_VIEW), async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const executions = await taskGroupService.getGroupExecutions(req.params.id, limit);
      res.json(executions);
    } catch (error) {
      logger.error('Error getting task group executions:', error);
      res.status(500).json({ error: 'Failed to get executions' });
    }
  });

  // ============================================
  // Task Membership Management
  // ============================================

  /**
   * POST /api/task-groups/:id/tasks
   * Add a task to a group
   */
  router.post('/:id/tasks', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    try {
      const { taskId, sortOrder } = req.body;
      if (!taskId) {
        return res.status(400).json({ error: 'taskId is required' });
      }
      await taskGroupService.addTask(req.params.id, taskId, sortOrder);
      return res.json({ message: 'Task added to group' });
    } catch (error: any) {
      logger.error('Error adding task to group:', error);
      return res.status(500).json({ error: error.message || 'Failed to add task' });
    }
  });

  /**
   * DELETE /api/task-groups/:id/tasks/:taskId
   * Remove a task from a group
   */
  router.delete('/:id/tasks/:taskId', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    try {
      await taskGroupService.removeTask(req.params.id, req.params.taskId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error removing task from group:', error);
      res.status(500).json({ error: 'Failed to remove task' });
    }
  });

  /**
   * PUT /api/task-groups/:id/tasks/order
   * Reorder tasks in a group
   */
  router.put('/:id/tasks/order', requirePermission(PERMISSIONS.SERVERS_UPDATE), async (req: Request, res: Response) => {
    try {
      const { taskIds } = req.body;
      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: 'taskIds array is required' });
      }
      await taskGroupService.reorderTasks(req.params.id, taskIds);
      return res.json({ message: 'Tasks reordered' });
    } catch (error) {
      logger.error('Error reordering tasks:', error);
      return res.status(500).json({ error: 'Failed to reorder tasks' });
    }
  });

  return router;
}
