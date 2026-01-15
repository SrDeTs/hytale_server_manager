import type {
  ScheduledTask,
  TaskHistory,
  ServerReport,
  PlayerAnalytics,
  ServerFile,
  PermissionGroup,
  EconomyStats,
  Shop,
  World,
  RealtimeMetrics,
} from '../types/advanced';

// ============================================================================
// MOCK SCHEDULED TASKS
// ============================================================================

export const mockScheduledTasks: ScheduledTask[] = [
  {
    id: 'task-001',
    serverId: 'srv-001',
    serverName: 'Hytale Main Server',
    name: 'Daily Restart',
    type: 'restart',
    frequency: 'daily',
    nextRun: new Date(Date.now() + 3600000 * 6),
    lastRun: new Date(Date.now() - 3600000 * 18),
    status: 'scheduled',
    enabled: true,
    announcement: 'Server restarting in 5 minutes for daily maintenance',
    createdAt: new Date(Date.now() - 86400000 * 30),
    createdBy: 'admin',
  },
  {
    id: 'task-002',
    serverId: 'srv-001',
    serverName: 'Hytale Main Server',
    name: 'Hourly Backup',
    type: 'backup',
    frequency: 'hourly',
    nextRun: new Date(Date.now() + 1800000),
    lastRun: new Date(Date.now() - 1800000),
    status: 'scheduled',
    enabled: true,
    createdAt: new Date(Date.now() - 86400000 * 60),
    createdBy: 'admin',
  },
  {
    id: 'task-003',
    serverId: 'srv-004',
    serverName: 'RPG Adventure Server',
    name: 'Clear Lag',
    type: 'command',
    frequency: 'custom',
    cronExpression: '*/15 * * * *', // Every 15 minutes
    nextRun: new Date(Date.now() + 900000),
    lastRun: new Date(Date.now() - 900000),
    status: 'scheduled',
    enabled: true,
    command: '/clearlag',
    createdAt: new Date(Date.now() - 86400000 * 15),
    createdBy: 'admin',
  },
  {
    id: 'task-004',
    serverId: 'srv-001',
    serverName: 'Hytale Main Server',
    name: 'Welcome Message',
    type: 'announcement',
    frequency: 'hourly',
    nextRun: new Date(Date.now() + 2400000),
    lastRun: new Date(Date.now() - 1200000),
    status: 'scheduled',
    enabled: true,
    announcement: 'Welcome to Hytale Main Server! Join our Discord for updates!',
    conditions: [
      { type: 'player_count', operator: 'greater', value: 5 },
    ],
    createdAt: new Date(Date.now() - 86400000 * 45),
    createdBy: 'moderator',
  },
];

export const mockTaskHistory: TaskHistory[] = [
  {
    id: 'hist-001',
    taskId: 'task-002',
    taskName: 'Hourly Backup',
    executedAt: new Date(Date.now() - 1800000),
    status: 'success',
    duration: 12543,
    output: 'Backup completed successfully. Size: 1.2 GB',
  },
  {
    id: 'hist-002',
    taskId: 'task-003',
    taskName: 'Clear Lag',
    executedAt: new Date(Date.now() - 900000),
    status: 'success',
    duration: 234,
    output: 'Removed 1,247 entities',
  },
  {
    id: 'hist-003',
    taskId: 'task-001',
    taskName: 'Daily Restart',
    executedAt: new Date(Date.now() - 86400000 + 3600000 * 6),
    status: 'success',
    duration: 45678,
    output: 'Server restarted successfully',
  },
];

// ============================================================================
// MOCK SERVER REPORTS
// ============================================================================

export const mockServerReports: ServerReport[] = [
  {
    id: 'report-001',
    serverId: 'srv-001',
    serverName: 'Hytale Main Server',
    period: 'daily',
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(),
    metrics: {
      averageTPS: 19.6,
      averagePlayers: 52,
      peakPlayers: 87,
      totalPlaytime: 7440, // 124 hours total
      uptime: 99.8,
      crashes: 0,
      restarts: 1,
    },
    playerStats: {
      uniquePlayers: 134,
      newPlayers: 12,
      returningPlayers: 122,
      averageSessionLength: 145, // minutes
    },
    performance: {
      averageCPU: 38.5,
      peakCPU: 72.3,
      averageMemory: 3680,
      peakMemory: 5120,
    },
  },
  {
    id: 'report-002',
    serverId: 'srv-001',
    serverName: 'Hytale Main Server',
    period: 'weekly',
    startDate: new Date(Date.now() - 86400000 * 7),
    endDate: new Date(),
    metrics: {
      averageTPS: 19.4,
      averagePlayers: 48,
      peakPlayers: 95,
      totalPlaytime: 48960,
      uptime: 99.2,
      crashes: 1,
      restarts: 7,
    },
    playerStats: {
      uniquePlayers: 456,
      newPlayers: 78,
      returningPlayers: 378,
      averageSessionLength: 138,
    },
    performance: {
      averageCPU: 41.2,
      peakCPU: 82.7,
      averageMemory: 3820,
      peakMemory: 6240,
    },
  },
];

export const mockPlayerAnalytics: PlayerAnalytics = {
  peakHours: [
    { hour: 0, players: 12 },
    { hour: 1, players: 8 },
    { hour: 2, players: 5 },
    { hour: 3, players: 3 },
    { hour: 4, players: 2 },
    { hour: 5, players: 4 },
    { hour: 6, players: 8 },
    { hour: 7, players: 15 },
    { hour: 8, players: 22 },
    { hour: 9, players: 28 },
    { hour: 10, players: 35 },
    { hour: 11, players: 42 },
    { hour: 12, players: 48 },
    { hour: 13, players: 52 },
    { hour: 14, players: 58 },
    { hour: 15, players: 67 },
    { hour: 16, players: 75 },
    { hour: 17, players: 82 },
    { hour: 18, players: 87 },
    { hour: 19, players: 85 },
    { hour: 20, players: 78 },
    { hour: 21, players: 65 },
    { hour: 22, players: 45 },
    { hour: 23, players: 28 },
  ],
  retentionRate: 78.5,
  growthRate: 12.3,
  averagePlaytime: 145,
  activityTrend: 'increasing',
};

// ============================================================================
// MOCK FILE SYSTEM
// ============================================================================

export const mockServerFiles: ServerFile[] = [
  {
    id: 'file-001',
    serverId: 'srv-001',
    name: 'mods',
    path: '/mods',
    type: 'directory',
    size: 52428800,
    modified: new Date(Date.now() - 3600000),
    permissions: ['read', 'write'],
    editable: false,
    children: [
      {
        id: 'file-002',
        serverId: 'srv-001',
        name: 'HyPermissions',
        path: '/mods/HyPermissions',
        type: 'directory',
        size: 512000,
        modified: new Date(Date.now() - 86400000),
        permissions: ['read', 'write'],
        editable: false,
      },
      {
        id: 'file-003',
        serverId: 'srv-001',
        name: 'HyEconomy',
        path: '/mods/HyEconomy',
        type: 'directory',
        size: 768000,
        modified: new Date(Date.now() - 86400000 * 2),
        permissions: ['read', 'write'],
        editable: false,
      },
    ],
  },
  {
    id: 'file-004',
    serverId: 'srv-001',
    name: 'config',
    path: '/config',
    type: 'directory',
    size: 1048576,
    modified: new Date(Date.now() - 7200000),
    permissions: ['read', 'write'],
    editable: false,
    children: [
      {
        id: 'file-005',
        serverId: 'srv-001',
        name: 'server.properties',
        path: '/config/server.properties',
        type: 'file',
        size: 2048,
        modified: new Date(Date.now() - 86400000 * 3),
        permissions: ['read', 'write'],
        editable: true,
        content: `# Hytale Server Properties
server-name=Hytale Main Server
server-port=25565
max-players=100
game-mode=exploration
difficulty=normal
view-distance=10
simulation-distance=8
spawn-protection=16
pvp=true
enable-command-blocks=true
motd=Welcome to Hytale Main Server!`,
      },
      {
        id: 'file-006',
        serverId: 'srv-001',
        name: 'permissions.yml',
        path: '/config/permissions.yml',
        type: 'file',
        size: 4096,
        modified: new Date(Date.now() - 86400000),
        permissions: ['read', 'write'],
        editable: true,
        content: `groups:
  default:
    permissions:
      - hytale.chat
      - hytale.build
    prefix: "&7[Player]&r "

  moderator:
    permissions:
      - hytale.kick
      - hytale.mute
      - hytale.ban
    inherits:
      - default
    prefix: "&e[Mod]&r "

  admin:
    permissions:
      - "*"
    inherits:
      - moderator
    prefix: "&c[Admin]&r "`,
      },
    ],
  },
  {
    id: 'file-007',
    serverId: 'srv-001',
    name: 'logs',
    path: '/logs',
    type: 'directory',
    size: 104857600,
    modified: new Date(Date.now() - 600000),
    permissions: ['read'],
    editable: false,
    children: [
      {
        id: 'file-008',
        serverId: 'srv-001',
        name: 'latest.log',
        path: '/logs/latest.log',
        type: 'file',
        size: 2097152,
        modified: new Date(Date.now() - 600000),
        permissions: ['read'],
        editable: false,
      },
    ],
  },
];

// ============================================================================
// MOCK PERMISSION GROUPS
// ============================================================================

export const mockPermissionGroups: PermissionGroup[] = [
  {
    id: 'group-001',
    name: 'default',
    displayName: 'Player',
    priority: 1,
    permissions: [
      'hytale.chat',
      'hytale.build',
      'hytale.trade',
      'hytale.warp.spawn',
    ],
    prefix: '&7[Player]&r ',
    color: '#9ca3af',
    members: ['player-003', 'player-004'],
    createdAt: new Date(Date.now() - 86400000 * 120),
    modifiedAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: 'group-002',
    name: 'vip',
    displayName: 'VIP',
    priority: 2,
    permissions: [
      'hytale.fly',
      'hytale.kit.vip',
      'hytale.home.multiple',
    ],
    inherits: ['group-001'],
    prefix: '&a[VIP]&r ',
    color: '#10b981',
    members: [],
    createdAt: new Date(Date.now() - 86400000 * 90),
    modifiedAt: new Date(Date.now() - 86400000 * 15),
  },
  {
    id: 'group-003',
    name: 'moderator',
    displayName: 'Moderator',
    priority: 50,
    permissions: [
      'hytale.kick',
      'hytale.mute',
      'hytale.ban.temp',
      'hytale.warn',
      'hytale.invsee',
    ],
    inherits: ['group-002'],
    prefix: '&e[Mod]&r ',
    color: '#f59e0b',
    members: ['player-002'],
    createdAt: new Date(Date.now() - 86400000 * 100),
    modifiedAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: 'group-004',
    name: 'admin',
    displayName: 'Administrator',
    priority: 100,
    permissions: ['*'],
    inherits: ['group-003'],
    prefix: '&c[Admin]&r ',
    color: '#ef4444',
    members: ['player-001'],
    createdAt: new Date(Date.now() - 86400000 * 120),
    modifiedAt: new Date(Date.now() - 86400000),
  },
];

// ============================================================================
// MOCK ECONOMY DATA
// ============================================================================

export const mockEconomyStats: EconomyStats = {
  totalCurrency: 12567890,
  averageBalance: 45678,
  medianBalance: 23450,
  richestPlayer: {
    uuid: 'player-001',
    username: 'DragonSlayer99',
    balance: 1234567,
  },
  recentTransactions: 3456,
  transactionVolume: 567890,
};

export const mockShops: Shop[] = [
  {
    id: 'shop-001',
    serverId: 'srv-001',
    name: 'Server Shop',
    owner: 'server',
    items: [
      {
        id: 'shopitem-001',
        itemId: 'ore_001',
        itemName: 'Gold Ore',
        buyPrice: 100,
        sellPrice: 50,
        stock: -1, // Unlimited
        iconUrl: 'https://via.placeholder.com/64/f59e0b/ffffff?text=G',
      },
      {
        id: 'shopitem-002',
        itemId: 'ore_002',
        itemName: 'Diamond Ore',
        buyPrice: 500,
        sellPrice: 250,
        stock: -1,
        iconUrl: 'https://via.placeholder.com/64/06b6d4/ffffff?text=D',
      },
      {
        id: 'shopitem-003',
        itemId: 'food_001',
        itemName: 'Cooked Meat',
        buyPrice: 10,
        sellPrice: 5,
        stock: -1,
        iconUrl: 'https://via.placeholder.com/64/8b5cf6/ffffff?text=M',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 120),
    revenue: 234567,
  },
  {
    id: 'shop-002',
    serverId: 'srv-001',
    name: "Dragon's Trading Post",
    owner: 'player-001',
    location: { world: 'Orbis', x: 1250, y: 65, z: -4500 },
    items: [
      {
        id: 'shopitem-004',
        itemId: 'gem_001',
        itemName: 'Ruby',
        buyPrice: 1000,
        sellPrice: 800,
        stock: 45,
        iconUrl: 'https://via.placeholder.com/64/ef4444/ffffff?text=R',
      },
      {
        id: 'shopitem-005',
        itemId: 'book_001',
        itemName: 'Enchanted Book',
        buyPrice: 2500,
        stock: 12,
        iconUrl: 'https://via.placeholder.com/64/8b5cf6/ffffff?text=B',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30),
    revenue: 45678,
  },
];

// ============================================================================
// MOCK WORLDS
// ============================================================================

export const mockWorlds: World[] = [
  {
    id: 'world-001',
    serverId: 'srv-001',
    name: 'Orbis',
    type: 'normal',
    seed: '-7238194726',
    difficulty: 'normal',
    gameRules: {
      doDaylightCycle: true,
      doMobSpawning: true,
      keepInventory: false,
      mobGriefing: true,
      naturalRegeneration: true,
      pvp: true,
    },
    spawn: { x: 0, y: 64, z: 0 },
    border: { center: { x: 0, z: 0 }, size: 10000 },
    loaded: true,
    size: 2147483648, // 2 GB
    playerCount: 47,
    lastPlayed: new Date(Date.now() - 300000),
    createdAt: new Date(Date.now() - 86400000 * 120),
  },
  {
    id: 'world-002',
    serverId: 'srv-001',
    name: 'Orbis_nether',
    type: 'nether',
    seed: '-7238194726',
    difficulty: 'normal',
    gameRules: {
      doDaylightCycle: false,
      doMobSpawning: true,
      keepInventory: false,
      mobGriefing: true,
      naturalRegeneration: true,
      pvp: true,
    },
    spawn: { x: 0, y: 64, z: 0 },
    border: { center: { x: 0, z: 0 }, size: 5000 },
    loaded: true,
    size: 524288000, // 500 MB
    playerCount: 8,
    lastPlayed: new Date(Date.now() - 1200000),
    createdAt: new Date(Date.now() - 86400000 * 120),
  },
  {
    id: 'world-003',
    serverId: 'srv-002',
    name: 'Creative',
    type: 'normal',
    seed: '123456789',
    difficulty: 'peaceful',
    gameRules: {
      doDaylightCycle: false,
      doMobSpawning: false,
      keepInventory: true,
      mobGriefing: false,
      naturalRegeneration: true,
      pvp: false,
    },
    spawn: { x: 500, y: 70, z: 800 },
    border: { center: { x: 500, z: 800 }, size: 5000 },
    loaded: true,
    size: 1073741824, // 1 GB
    playerCount: 23,
    lastPlayed: new Date(Date.now() - 180000),
    createdAt: new Date(Date.now() - 86400000 * 90),
  },
];

// ============================================================================
// REALTIME METRICS GENERATOR
// ============================================================================

export const generateRealtimeMetrics = (serverId: string): RealtimeMetrics => ({
  serverId,
  timestamp: new Date(),
  tps: 19.5 + Math.random() * 0.5,
  players: Math.floor(Math.random() * 10) + 40,
  cpuUsage: 35 + Math.random() * 20,
  memoryUsage: 3500 + Math.random() * 1000,
});
