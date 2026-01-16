import { PrismaClient, TaskGroup, TaskGroupMember, TaskGroupExecution } from '@prisma/client';
import cron from 'node-cron';
import { SchedulerService } from './SchedulerService';
import logger from '../utils/logger';

interface TaskWithServer {
  id: string;
  name: string;
  type: string;
  serverId: string;
  enabled: boolean;
  cronExpression: string;
  taskData: string | null;
  server: { id: string; name: string };
}

interface TaskGroupMemberWithTask extends TaskGroupMember {
  task: TaskWithServer;
}

interface TaskGroupWithMembers extends TaskGroup {
  taskMemberships: TaskGroupMemberWithTask[];
}

interface TaskResult {
  taskId: string;
  taskName: string;
  serverId: string;
  serverName: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class TaskGroupService {
  private prisma: PrismaClient;
  private schedulerService: SchedulerService;
  private scheduledGroups: Map<string, cron.ScheduledTask> = new Map();

  constructor(prisma: PrismaClient, schedulerService: SchedulerService) {
    this.prisma = prisma;
    this.schedulerService = schedulerService;
  }

  /**
   * Load all enabled task groups from database and schedule them
   */
  async loadTaskGroups(): Promise<void> {
    try {
      const groups = await this.prisma.taskGroup.findMany({
        where: { enabled: true },
      });

      logger.info(`Loading ${groups.length} task groups...`);

      for (const group of groups) {
        try {
          this.scheduleGroup(group);
        } catch (error) {
          logger.error(`Failed to schedule task group ${group.name}:`, error);
        }
      }

      logger.info('All task groups loaded');
    } catch (error) {
      logger.error('Error loading task groups:', error);
    }
  }

  /**
   * Schedule a task group
   */
  scheduleGroup(group: TaskGroup): void {
    if (!cron.validate(group.cronExpression)) {
      logger.error(`Invalid cron expression for task group ${group.name}: ${group.cronExpression}`);
      return;
    }

    // Stop existing schedule if any
    if (this.scheduledGroups.has(group.id)) {
      this.scheduledGroups.get(group.id)?.stop();
      this.scheduledGroups.delete(group.id);
    }

    const cronTask = cron.schedule(
      group.cronExpression,
      async () => {
        await this.executeGroup(group.id);
      },
      { scheduled: true, timezone: 'UTC' }
    );

    this.scheduledGroups.set(group.id, cronTask);
    logger.info(`Scheduled task group: ${group.name} (${group.cronExpression})`);
  }

  /**
   * Execute a task group - runs all tasks in sequence
   */
  async executeGroup(groupId: string): Promise<TaskGroupExecution> {
    const group = await this.getGroupWithTasks(groupId);
    if (!group) {
      throw new Error(`Task group ${groupId} not found`);
    }

    logger.info(`Executing task group: ${group.name}`);

    // Create execution record
    const execution = await this.prisma.taskGroupExecution.create({
      data: {
        groupId,
        tasksTotal: group.taskMemberships.length,
        status: 'running',
      },
    });

    const results: TaskResult[] = [];
    let failed = false;

    // Sort tasks by sortOrder
    const sortedTasks = [...group.taskMemberships].sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < sortedTasks.length; i++) {
      const membership = sortedTasks[i];
      const task = membership.task;

      // Skip if task is disabled
      if (!task.enabled) {
        results.push({
          taskId: task.id,
          taskName: task.name,
          serverId: task.serverId,
          serverName: task.server.name,
          status: 'skipped',
          error: 'Task is disabled',
          startedAt: new Date(),
          completedAt: new Date(),
        });
        continue;
      }

      // Check if we should skip due to previous failure
      if (failed && group.failureMode === 'stop') {
        results.push({
          taskId: task.id,
          taskName: task.name,
          serverId: task.serverId,
          serverName: task.server.name,
          status: 'skipped',
          error: 'Skipped due to previous task failure',
          startedAt: new Date(),
          completedAt: new Date(),
        });
        continue;
      }

      // Execute the task
      const taskStarted = new Date();
      try {
        await this.schedulerService.executeTask(task);
        results.push({
          taskId: task.id,
          taskName: task.name,
          serverId: task.serverId,
          serverName: task.server.name,
          status: 'success',
          startedAt: taskStarted,
          completedAt: new Date(),
        });
      } catch (error: any) {
        failed = true;
        results.push({
          taskId: task.id,
          taskName: task.name,
          serverId: task.serverId,
          serverName: task.server.name,
          status: 'failed',
          error: error.message,
          startedAt: taskStarted,
          completedAt: new Date(),
        });
      }

      // Apply delay before next task (if not last task)
      if (i < sortedTasks.length - 1 && group.delayBetweenTasks > 0) {
        logger.info(`Waiting ${group.delayBetweenTasks} seconds before next task...`);
        await this.delay(group.delayBetweenTasks * 1000);
      }
    }

    // Calculate final status
    const completed = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    let status: string;
    if (failedCount === 0 && skippedCount === 0) {
      status = 'success';
    } else if (completed === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    // Update execution record
    const updatedExecution = await this.prisma.taskGroupExecution.update({
      where: { id: execution.id },
      data: {
        completedAt: new Date(),
        status,
        tasksCompleted: completed,
        tasksFailed: failedCount,
        tasksSkipped: skippedCount,
        taskResults: JSON.stringify(results),
        errorMessage: failedCount > 0 ? `${failedCount} task(s) failed` : null,
      },
    });

    // Update group status
    await this.prisma.taskGroup.update({
      where: { id: groupId },
      data: {
        lastRun: new Date(),
        lastStatus: status,
        lastError: failedCount > 0 ? `${failedCount} task(s) failed` : null,
      },
    });

    logger.info(`Task group ${group.name} completed: ${completed}/${results.length} successful`);
    return updatedExecution;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================
  // CRUD Operations
  // ==========================================

  /**
   * Create a new task group
   */
  async createGroup(data: {
    name: string;
    description?: string;
    cronExpression: string;
    failureMode?: 'stop' | 'continue';
    delayBetweenTasks?: number;
    enabled?: boolean;
    taskIds?: string[];
  }): Promise<TaskGroup> {
    if (!cron.validate(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`);
    }

    const group = await this.prisma.taskGroup.create({
      data: {
        name: data.name,
        description: data.description,
        cronExpression: data.cronExpression,
        failureMode: data.failureMode || 'stop',
        delayBetweenTasks: data.delayBetweenTasks || 0,
        enabled: data.enabled !== false,
      },
    });

    // Add tasks if provided
    if (data.taskIds && data.taskIds.length > 0) {
      for (let i = 0; i < data.taskIds.length; i++) {
        await this.addTask(group.id, data.taskIds[i], i);
      }
    }

    if (group.enabled) {
      this.scheduleGroup(group);
    }

    logger.info(`Created task group: ${group.name}`);
    return group;
  }

  /**
   * Update a task group
   */
  async updateGroup(groupId: string, data: Partial<{
    name: string;
    description: string;
    cronExpression: string;
    failureMode: 'stop' | 'continue';
    delayBetweenTasks: number;
    enabled: boolean;
  }>): Promise<TaskGroup> {
    if (data.cronExpression && !cron.validate(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`);
    }

    const group = await this.prisma.taskGroup.update({
      where: { id: groupId },
      data,
    });

    // Reschedule if enabled
    if (group.enabled) {
      this.scheduleGroup(group);
    } else {
      // Stop if disabled
      if (this.scheduledGroups.has(groupId)) {
        this.scheduledGroups.get(groupId)?.stop();
        this.scheduledGroups.delete(groupId);
      }
    }

    return group;
  }

  /**
   * Delete a task group
   */
  async deleteGroup(groupId: string): Promise<void> {
    // Stop scheduled task
    if (this.scheduledGroups.has(groupId)) {
      this.scheduledGroups.get(groupId)?.stop();
      this.scheduledGroups.delete(groupId);
    }

    await this.prisma.taskGroup.delete({
      where: { id: groupId },
    });

    logger.info(`Deleted task group: ${groupId}`);
  }

  /**
   * Toggle group enabled/disabled
   */
  async toggleGroup(groupId: string, enabled: boolean): Promise<TaskGroup> {
    return this.updateGroup(groupId, { enabled });
  }

  // ==========================================
  // Membership Management
  // ==========================================

  /**
   * Add a task to a group
   */
  async addTask(groupId: string, taskId: string, sortOrder?: number): Promise<void> {
    // Get next sort order if not provided
    if (sortOrder === undefined) {
      const maxSort = await this.prisma.taskGroupMember.aggregate({
        where: { groupId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    }

    await this.prisma.taskGroupMember.create({
      data: { groupId, taskId, sortOrder },
    });

    logger.info(`Added task ${taskId} to group ${groupId} at position ${sortOrder}`);
  }

  /**
   * Remove a task from a group
   */
  async removeTask(groupId: string, taskId: string): Promise<void> {
    await this.prisma.taskGroupMember.delete({
      where: { groupId_taskId: { groupId, taskId } },
    });

    logger.info(`Removed task ${taskId} from group ${groupId}`);
  }

  /**
   * Reorder tasks in a group
   */
  async reorderTasks(groupId: string, taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await this.prisma.taskGroupMember.update({
        where: { groupId_taskId: { groupId, taskId: taskIds[i] } },
        data: { sortOrder: i },
      });
    }

    logger.info(`Reordered tasks in group ${groupId}`);
  }

  // ==========================================
  // Query Methods
  // ==========================================

  /**
   * Get a single task group
   */
  async getGroup(groupId: string): Promise<TaskGroup | null> {
    return this.prisma.taskGroup.findUnique({
      where: { id: groupId },
    });
  }

  /**
   * Get a task group with all its tasks
   */
  async getGroupWithTasks(groupId: string): Promise<TaskGroupWithMembers | null> {
    return this.prisma.taskGroup.findUnique({
      where: { id: groupId },
      include: {
        taskMemberships: {
          include: {
            task: {
              include: {
                server: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }) as Promise<TaskGroupWithMembers | null>;
  }

  /**
   * Get all task groups
   */
  async getAllGroups(): Promise<TaskGroupWithMembers[]> {
    return this.prisma.taskGroup.findMany({
      include: {
        taskMemberships: {
          include: {
            task: {
              include: {
                server: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<TaskGroupWithMembers[]>;
  }

  /**
   * Get execution history for a group
   */
  async getGroupExecutions(groupId: string, limit = 20): Promise<TaskGroupExecution[]> {
    return this.prisma.taskGroupExecution.findMany({
      where: { groupId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // Cleanup
  // ==========================================

  /**
   * Stop all scheduled group tasks
   */
  cleanup(): void {
    logger.info('Stopping all task group schedules...');
    for (const [groupId, cronTask] of this.scheduledGroups) {
      cronTask.stop();
      logger.info(`Stopped task group: ${groupId}`);
    }
    this.scheduledGroups.clear();
    logger.info('All task group schedules stopped');
  }
}
