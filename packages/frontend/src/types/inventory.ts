// ============================================================================
// INVENTORY & ITEMS TYPES
// ============================================================================

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'tool' | 'consumable' | 'material' | 'block' | 'misc';
export type ArmorSlot = 'helmet' | 'chestplate' | 'leggings' | 'boots';
export type EquipmentSlot = 'mainhand' | 'offhand' | 'helmet' | 'chestplate' | 'leggings' | 'boots';

export interface ItemStack {
  itemId: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  amount: number;
  maxStack: number;
  iconUrl: string;
  description?: string;
  enchantments?: Enchantment[];
  durability?: {
    current: number;
    max: number;
  };
}

export interface Enchantment {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
}

export interface PlayerInventory {
  playerId: string;
  hotbar: (ItemStack | null)[];
  inventory: (ItemStack | null)[];
  armor: {
    helmet: ItemStack | null;
    chestplate: ItemStack | null;
    leggings: ItemStack | null;
    boots: ItemStack | null;
  };
  offhand: ItemStack | null;
  enderChest: (ItemStack | null)[];
}

// ============================================================================
// PLAYER ACTIVITY & HISTORY TYPES
// ============================================================================

export type ActivityType =
  | 'login'
  | 'logout'
  | 'death'
  | 'kill_player'
  | 'kill_mob'
  | 'achievement'
  | 'chat'
  | 'command'
  | 'block_place'
  | 'block_break'
  | 'item_craft'
  | 'trade';

export interface PlayerActivity {
  id: string;
  playerId: string;
  type: ActivityType;
  timestamp: Date;
  description: string;
  metadata?: Record<string, any>;
  location?: {
    x: number;
    y: number;
    z: number;
    world: string;
  };
}

export interface PlayerStats {
  playerId: string;
  statistics: {
    mobsKilled: number;
    playersKilled: number;
    deaths: number;
    blocksBroken: number;
    blocksPlaced: number;
    distanceWalked: number;
    distanceFlown: number;
    itemsCrafted: number;
    damageDealt: number;
    damageTaken: number;
    jumps: number;
    playtime: number; // minutes
  };
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
  rarity: ItemRarity;
}

// ============================================================================
// PLAYER SESSION TYPES
// ============================================================================

export interface PlayerSession {
  id: string;
  playerId: string;
  serverId: string;
  serverName: string;
  joinedAt: Date;
  leftAt?: Date;
  duration?: number; // minutes
  ipAddress: string;
}

// ============================================================================
// PLAYER ECONOMY TYPES
// ============================================================================

export interface PlayerEconomy {
  playerId: string;
  balance: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'earn' | 'spend' | 'transfer';
  amount: number;
  description: string;
  timestamp: Date;
  balance: number; // Balance after transaction
}
