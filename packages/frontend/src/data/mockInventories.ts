import type { PlayerInventory, ItemStack, PlayerActivity, PlayerStats, PlayerSession } from '../types/inventory';

// ============================================================================
// MOCK ITEM STACKS
// ============================================================================

const createItemStack = (
  itemId: string,
  name: string,
  type: ItemStack['type'],
  rarity: ItemStack['rarity'],
  amount: number = 1
): ItemStack => ({
  itemId,
  name,
  type,
  rarity,
  amount,
  maxStack: type === 'block' || type === 'material' ? 64 : type === 'consumable' ? 16 : 1,
  iconUrl: `https://via.placeholder.com/64/${rarity === 'legendary' ? 'f59e0b' : rarity === 'epic' ? '8b5cf6' : rarity === 'rare' ? '06b6d4' : rarity === 'uncommon' ? '10b981' : '6b7280'}/ffffff?text=${name.charAt(0)}`,
});

// ============================================================================
// MOCK PLAYER INVENTORIES
// ============================================================================

export const mockPlayerInventories: Record<string, PlayerInventory> = {
  'player-001': {
    playerId: 'player-001',
    hotbar: [
      { ...createItemStack('sword_001', 'Dragon Slayer Sword', 'weapon', 'legendary'), durability: { current: 1200, max: 1500 } },
      createItemStack('bow_001', 'Enchanted Bow', 'weapon', 'epic'),
      createItemStack('pickaxe_001', 'Diamond Pickaxe', 'tool', 'rare'),
      createItemStack('food_001', 'Cooked Meat', 'consumable', 'common', 16),
      createItemStack('potion_001', 'Health Potion', 'consumable', 'uncommon', 8),
      createItemStack('block_001', 'Stone Bricks', 'block', 'common', 64),
      null,
      null,
      createItemStack('torch_001', 'Torch', 'block', 'common', 64),
    ],
    inventory: [
      createItemStack('ore_001', 'Gold Ore', 'material', 'uncommon', 32),
      createItemStack('ore_002', 'Diamond Ore', 'material', 'rare', 12),
      createItemStack('ingot_001', 'Iron Ingot', 'material', 'common', 64),
      createItemStack('wood_001', 'Oak Wood', 'material', 'common', 64),
      createItemStack('arrow_001', 'Arrow', 'consumable', 'common', 64),
      createItemStack('book_001', 'Enchanted Book', 'misc', 'rare'),
      null,
      createItemStack('gem_001', 'Ruby', 'material', 'epic', 5),
      null, null, null, null,
      createItemStack('block_002', 'Cobblestone', 'block', 'common', 64),
      createItemStack('block_003', 'Dirt', 'block', 'common', 64),
      null, null, null, null, null, null, null, null, null, null, null, null, null,
    ],
    armor: {
      helmet: { ...createItemStack('helm_001', 'Dragon Scale Helmet', 'armor', 'legendary'), durability: { current: 800, max: 1000 } },
      chestplate: { ...createItemStack('chest_001', 'Dragon Scale Chestplate', 'armor', 'legendary'), durability: { current: 950, max: 1000 } },
      leggings: { ...createItemStack('legs_001', 'Dragon Scale Leggings', 'armor', 'legendary'), durability: { current: 900, max: 1000 } },
      boots: { ...createItemStack('boots_001', 'Dragon Scale Boots', 'armor', 'legendary'), durability: { current: 850, max: 1000 } },
    },
    offhand: createItemStack('shield_001', 'Enchanted Shield', 'armor', 'epic'),
    enderChest: [
      createItemStack('ore_003', 'Ancient Artifact', 'misc', 'legendary'),
      createItemStack('book_002', 'Rare Spell Book', 'misc', 'epic'),
      null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null,
    ],
  },
  'player-002': {
    playerId: 'player-002',
    hotbar: [
      createItemStack('axe_001', 'Builder\'s Axe', 'tool', 'uncommon'),
      createItemStack('shovel_001', 'Golden Shovel', 'tool', 'rare'),
      createItemStack('block_004', 'Oak Planks', 'block', 'common', 64),
      createItemStack('block_005', 'Glass', 'block', 'common', 64),
      createItemStack('block_006', 'Marble', 'block', 'uncommon', 64),
      null, null, null, null,
    ],
    inventory: [
      createItemStack('block_007', 'Sandstone', 'block', 'common', 64),
      createItemStack('block_008', 'Quartz', 'block', 'uncommon', 48),
      createItemStack('dye_001', 'Blue Dye', 'material', 'common', 16),
      createItemStack('dye_002', 'Red Dye', 'material', 'common', 16),
      createItemStack('wood_002', 'Birch Wood', 'material', 'common', 64),
      null, null, null, null, null, null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null,
    ],
    armor: {
      helmet: createItemStack('helm_002', 'Builder\'s Cap', 'armor', 'common'),
      chestplate: null,
      leggings: createItemStack('legs_002', 'Leather Pants', 'armor', 'common'),
      boots: createItemStack('boots_002', 'Leather Boots', 'armor', 'common'),
    },
    offhand: null,
    enderChest: Array(27).fill(null),
  },
};

// ============================================================================
// MOCK PLAYER ACTIVITIES
// ============================================================================

export const mockPlayerActivities: Record<string, PlayerActivity[]> = {
  'player-001': [
    {
      id: 'act-001',
      playerId: 'player-001',
      type: 'login',
      timestamp: new Date(Date.now() - 300000),
      description: 'Logged into Hytale Main Server',
      metadata: { server: 'srv-001' },
    },
    {
      id: 'act-002',
      playerId: 'player-001',
      type: 'achievement',
      timestamp: new Date(Date.now() - 280000),
      description: 'Unlocked achievement: Dragon Slayer',
      metadata: { achievement: 'dragon_slayer' },
    },
    {
      id: 'act-003',
      playerId: 'player-001',
      type: 'kill_mob',
      timestamp: new Date(Date.now() - 260000),
      description: 'Killed Ancient Dragon',
      metadata: { mob: 'ancient_dragon', damage: 15000 },
      location: { x: 1250, y: 128, z: -4500, world: 'Orbis' },
    },
    {
      id: 'act-004',
      playerId: 'player-001',
      type: 'chat',
      timestamp: new Date(Date.now() - 240000),
      description: 'Hello everyone!',
      metadata: { channel: 'global' },
    },
    {
      id: 'act-005',
      playerId: 'player-001',
      type: 'item_craft',
      timestamp: new Date(Date.now() - 220000),
      description: 'Crafted Dragon Scale Armor Set',
      metadata: { item: 'dragon_armor_set', quantity: 1 },
    },
  ],
  'player-002': [
    {
      id: 'act-101',
      playerId: 'player-002',
      type: 'login',
      timestamp: new Date(Date.now() - 180000),
      description: 'Logged into Creative Build Server',
      metadata: { server: 'srv-002' },
    },
    {
      id: 'act-102',
      playerId: 'player-002',
      type: 'block_place',
      timestamp: new Date(Date.now() - 160000),
      description: 'Placed 500 blocks',
      metadata: { blocks: 500 },
      location: { x: 500, y: 70, z: 800, world: 'Creative' },
    },
  ],
};

// ============================================================================
// MOCK PLAYER STATS
// ============================================================================

export const mockPlayerStats: Record<string, PlayerStats> = {
  'player-001': {
    playerId: 'player-001',
    statistics: {
      mobsKilled: 1247,
      playersKilled: 23,
      deaths: 87,
      blocksBroken: 45678,
      blocksPlaced: 32145,
      distanceWalked: 458920,
      distanceFlown: 12450,
      itemsCrafted: 3421,
      damageDealt: 245678,
      damageTaken: 87234,
      jumps: 12456,
      playtime: 18540,
    },
    achievements: [
      {
        id: 'ach-001',
        name: 'Dragon Slayer',
        description: 'Defeat an Ancient Dragon',
        iconUrl: 'https://via.placeholder.com/64/f59e0b/ffffff?text=DS',
        unlockedAt: new Date(Date.now() - 280000),
        rarity: 'legendary',
      },
      {
        id: 'ach-002',
        name: 'Master Miner',
        description: 'Mine 10,000 blocks',
        iconUrl: 'https://via.placeholder.com/64/06b6d4/ffffff?text=MM',
        unlockedAt: new Date(Date.now() - 86400000 * 5),
        rarity: 'epic',
      },
      {
        id: 'ach-003',
        name: 'First Steps',
        description: 'Join the server for the first time',
        iconUrl: 'https://via.placeholder.com/64/10b981/ffffff?text=FS',
        unlockedAt: new Date(Date.now() - 86400000 * 120),
        rarity: 'common',
      },
    ],
  },
  'player-002': {
    playerId: 'player-002',
    statistics: {
      mobsKilled: 45,
      playersKilled: 0,
      deaths: 12,
      blocksBroken: 8234,
      blocksPlaced: 45678,
      distanceWalked: 124500,
      distanceFlown: 890,
      itemsCrafted: 1234,
      damageDealt: 8900,
      damageTaken: 5600,
      jumps: 4567,
      playtime: 12360,
    },
    achievements: [
      {
        id: 'ach-003',
        name: 'First Steps',
        description: 'Join the server for the first time',
        iconUrl: 'https://via.placeholder.com/64/10b981/ffffff?text=FS',
        unlockedAt: new Date(Date.now() - 86400000 * 90),
        rarity: 'common',
      },
      {
        id: 'ach-004',
        name: 'Builder',
        description: 'Place 10,000 blocks',
        iconUrl: 'https://via.placeholder.com/64/8b5cf6/ffffff?text=B',
        unlockedAt: new Date(Date.now() - 86400000 * 30),
        rarity: 'rare',
      },
    ],
  },
};

// ============================================================================
// MOCK PLAYER SESSIONS
// ============================================================================

export const mockPlayerSessions: Record<string, PlayerSession[]> = {
  'player-001': [
    {
      id: 'sess-001',
      playerId: 'player-001',
      serverId: 'srv-001',
      serverName: 'Hytale Main Server',
      joinedAt: new Date(Date.now() - 300000),
      ipAddress: '192.168.1.105',
    },
    {
      id: 'sess-002',
      playerId: 'player-001',
      serverId: 'srv-001',
      serverName: 'Hytale Main Server',
      joinedAt: new Date(Date.now() - 86400000),
      leftAt: new Date(Date.now() - 86400000 + 7200000),
      duration: 120,
      ipAddress: '192.168.1.105',
    },
    {
      id: 'sess-003',
      playerId: 'player-001',
      serverId: 'srv-004',
      serverName: 'RPG Adventure Server',
      joinedAt: new Date(Date.now() - 86400000 * 2),
      leftAt: new Date(Date.now() - 86400000 * 2 + 10800000),
      duration: 180,
      ipAddress: '192.168.1.105',
    },
  ],
  'player-002': [
    {
      id: 'sess-101',
      playerId: 'player-002',
      serverId: 'srv-002',
      serverName: 'Creative Build Server',
      joinedAt: new Date(Date.now() - 180000),
      ipAddress: '192.168.1.108',
    },
  ],
};
