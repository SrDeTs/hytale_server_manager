import { PrismaClient, ActivityLog } from '@prisma/client';
import { getActionCategory, ActionCategory, ResourceType } from '../constants/ActivityLogActions';
import logger from '../utils/logger';

// ==========================================
// Types
// ==========================================

export interface ActivityLogEntry {
  userId: string;
  username: string;
  userRole: string;
  action: string;
  resourceType: ResourceType | string;
  resourceId?: string | null;
  resourceName?: string | null;
  status?: 'success' | 'failed';
  errorMessage?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  actionCategory?: ActionCategory | string;
  resourceType?: ResourceType | string;
  resourceId?: string;
  status?: 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'action' | 'username';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// Activity Log Service
// ==========================================

export class ActivityLogService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log an activity synchronously
   * Use this for critical actions where you need to ensure the log is recorded
   */
  async log(entry: ActivityLogEntry): Promise<ActivityLog> {
    try {
      const actionCategory = getActionCategory(entry.action);

      const activityLog = await this.prisma.activityLog.create({
        data: {
          userId: entry.userId,
          username: entry.username,
          userRole: entry.userRole,
          action: entry.action,
          actionCategory,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId || null,
          resourceName: entry.resourceName || null,
          status: entry.status || 'success',
          errorMessage: entry.errorMessage || null,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
        },
      });

      logger.debug(`Activity logged: ${entry.action} by ${entry.username} on ${entry.resourceType}/${entry.resourceId}`);

      return activityLog;
    } catch (error) {
      logger.error('Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Log an activity asynchronously (fire and forget)
   * Use this for non-critical actions where logging shouldn't block the main flow
   */
  logAsync(entry: ActivityLogEntry): void {
    this.log(entry).catch((error) => {
      logger.error('Async activity log failed:', error);
    });
  }

  /**
   * Query activity logs with filtering and pagination
   */
  async query(
    filters: ActivityLogFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.actionCategory) {
      where.actionCategory = filters.actionCategory;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        (where.timestamp as Record<string, unknown>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.timestamp as Record<string, unknown>).lte = filters.endDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { resourceName: { contains: filters.search } },
        { action: { contains: filters.search } },
      ];
    }

    // Get total count
    const total = await this.prisma.activityLog.count({ where });

    // Get paginated data
    const data = await this.prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent activity (for dashboard widget)
   */
  async getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get activity for a specific server
   */
  async getServerActivity(serverId: string, limit: number = 50): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: {
        resourceType: 'server',
        resourceId: serverId,
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get activity for a specific user
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get activity statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalActions: number;
    actionsByCategory: Record<string, number>;
    actionsByStatus: Record<string, number>;
    topUsers: Array<{ username: string; count: number }>;
  }> {
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        (where.timestamp as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.timestamp as Record<string, unknown>).lte = endDate;
      }
    }

    // Total actions
    const totalActions = await this.prisma.activityLog.count({ where });

    // Actions by category
    const categoryGroups = await this.prisma.activityLog.groupBy({
      by: ['actionCategory'],
      where,
      _count: { id: true },
    });

    const actionsByCategory: Record<string, number> = {};
    for (const group of categoryGroups) {
      actionsByCategory[group.actionCategory] = group._count.id;
    }

    // Actions by status
    const statusGroups = await this.prisma.activityLog.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const actionsByStatus: Record<string, number> = {};
    for (const group of statusGroups) {
      actionsByStatus[group.status] = group._count.id;
    }

    // Top users
    const userGroups = await this.prisma.activityLog.groupBy({
      by: ['username'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topUsers = userGroups.map((group) => ({
      username: group.username,
      count: group._count.id,
    }));

    return {
      totalActions,
      actionsByCategory,
      actionsByStatus,
      topUsers,
    };
  }

  /**
   * Get single activity log by ID
   */
  async getById(id: string): Promise<ActivityLog | null> {
    return this.prisma.activityLog.findUnique({
      where: { id },
    });
  }
}
