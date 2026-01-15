// ============================================================================
// TASK SCHEDULER & AUTOMATION TYPES
// ============================================================================

export type TaskType = 'command' | 'restart' | 'backup' | 'announcement' | 'custom';
export type TaskStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ScheduledTask {
  id: string;
  serverId: string;
  serverName: string;
  name: string;
  type: TaskType;
  frequency: TaskFrequency;
  cronExpression?: string;
  nextRun: Date;
  lastRun?: Date;
  status: TaskStatus;
  enabled: boolean;
  command?: string;
  announcement?: string;
  conditions?: TaskCondition[];
  createdAt: Date;
  createdBy: string;
}

export interface TaskCondition {
  type: 'player_count' | 'server_status' | 'time' | 'tps';
  operator: 'equals' | 'greater' | 'less' | 'between';
  value: number | string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  taskName: string;
  executedAt: Date;
  status: 'success' | 'failed';
  duration: number; // ms
  output?: string;
  error?: string;
}

// ============================================================================
// ANALYTICS & REPORTS TYPES
// ============================================================================

export interface ServerReport {
  id: string;
  serverId: string;
  serverName: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: {
    averageTPS: number;
    averagePlayers: number;
    peakPlayers: number;
    totalPlaytime: number; // minutes
    uptime: number; // percentage
    crashes: number;
    restarts: number;
  };
  playerStats: {
    uniquePlayers: number;
    newPlayers: number;
    returningPlayers: number;
    averageSessionLength: number; // minutes
  };
  performance: {
    averageCPU: number;
    peakCPU: number;
    averageMemory: number;
    peakMemory: number;
  };
}

export interface PlayerAnalytics {
  peakHours: { hour: number; players: number }[];
  retentionRate: number; // percentage
  growthRate: number; // percentage
  averagePlaytime: number; // minutes per player
  activityTrend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================================================
// FILE SYSTEM TYPES
// ============================================================================

export type FileType = 'file' | 'directory';
export type FilePermission = 'read' | 'write' | 'execute';

export interface ServerFile {
  id: string;
  serverId: string;
  name: string;
  path: string;
  type: FileType;
  size: number;
  modified: Date;
  permissions: FilePermission[];
  content?: string;
  editable: boolean;
  children?: ServerFile[];
}

export interface FileEdit {
  fileId: string;
  path: string;
  content: string;
  lastSaved: Date;
  isDirty: boolean;
}

// ============================================================================
// PERMISSION SYSTEM TYPES
// ============================================================================

export interface PermissionNode {
  id: string;
  name: string;
  description: string;
  value: boolean;
  children?: PermissionNode[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  displayName: string;
  priority: number;
  permissions: string[];
  inherits?: string[]; // Group IDs to inherit from
  prefix?: string;
  suffix?: string;
  color?: string;
  members: string[]; // Player UUIDs
  createdAt: Date;
  modifiedAt: Date;
}

export interface PlayerPermissions {
  playerId: string;
  groups: string[]; // Group IDs
  directPermissions: string[];
  inheritedPermissions: string[];
  effectivePermissions: string[];
}

// ============================================================================
// ECONOMY TYPES
// ============================================================================

export interface EconomyStats {
  totalCurrency: number;
  averageBalance: number;
  medianBalance: number;
  richestPlayer: {
    uuid: string;
    username: string;
    balance: number;
  };
  recentTransactions: number; // last 24h
  transactionVolume: number; // last 24h
}

export interface Shop {
  id: string;
  serverId: string;
  name: string;
  owner?: string; // Player UUID or 'server'
  location?: {
    world: string;
    x: number;
    y: number;
    z: number;
  };
  items: ShopItem[];
  createdAt: Date;
  revenue?: number;
}

export interface ShopItem {
  id: string;
  itemId: string;
  itemName: string;
  buyPrice?: number;
  sellPrice?: number;
  stock?: number;
  iconUrl: string;
}

// ============================================================================
// WORLD MANAGEMENT TYPES
// ============================================================================

export type WorldType = 'normal' | 'nether' | 'end' | 'custom';
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';

export interface World {
  id: string;
  serverId: string;
  name: string;
  type: WorldType;
  seed: string;
  difficulty: Difficulty;
  gameRules: Record<string, boolean | number | string>;
  spawn: {
    x: number;
    y: number;
    z: number;
  };
  border: {
    center: { x: number; z: number };
    size: number;
  };
  loaded: boolean;
  size: number; // bytes
  playerCount: number;
  lastPlayed?: Date;
  createdAt: Date;
}

export interface WorldBackup {
  id: string;
  worldId: string;
  worldName: string;
  size: number;
  createdAt: Date;
  completedAt?: Date;
  status: 'completed' | 'in-progress' | 'failed';
}

// ============================================================================
// REAL-TIME EVENT TYPES
// ============================================================================

export interface RealtimeMetrics {
  serverId: string;
  timestamp: Date;
  tps: number;
  players: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface LivePlayerPosition {
  playerId: string;
  username: string;
  world: string;
  x: number;
  y: number;
  z: number;
  timestamp: Date;
}
