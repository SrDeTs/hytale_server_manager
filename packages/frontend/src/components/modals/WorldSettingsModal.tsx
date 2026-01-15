import { useState } from 'react';
import { Modal, Input, Button, Badge } from '../ui';
import type { World } from '../../types';

interface WorldSettingsModalProps {
  world: World;
  isOpen: boolean;
  onClose: () => void;
  onSave: (world: World) => void;
}

export const WorldSettingsModal = ({ world, isOpen, onClose, onSave }: WorldSettingsModalProps) => {
  const [editedWorld, setEditedWorld] = useState<World>(world);
  const [activeTab, setActiveTab] = useState<'basic' | 'gamerules' | 'border'>('basic');

  const handleSave = () => {
    onSave(editedWorld);
    onClose();
  };

  const updateGameRule = (rule: string, value: boolean | number | string) => {
    setEditedWorld({
      ...editedWorld,
      gameRules: {
        ...editedWorld.gameRules,
        [rule]: value,
      },
    });
  };

  const commonGameRules = [
    { key: 'doDaylightCycle', label: 'Daylight Cycle', type: 'boolean' },
    { key: 'doWeatherCycle', label: 'Weather Cycle', type: 'boolean' },
    { key: 'doMobSpawning', label: 'Mob Spawning', type: 'boolean' },
    { key: 'keepInventory', label: 'Keep Inventory', type: 'boolean' },
    { key: 'mobGriefing', label: 'Mob Griefing', type: 'boolean' },
    { key: 'naturalRegeneration', label: 'Natural Regeneration', type: 'boolean' },
    { key: 'showDeathMessages', label: 'Show Death Messages', type: 'boolean' },
    { key: 'doFireTick', label: 'Fire Tick', type: 'boolean' },
    { key: 'randomTickSpeed', label: 'Random Tick Speed', type: 'number' },
    { key: 'spawnRadius', label: 'Spawn Radius', type: 'number' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-4">
          World Settings - {world.name}
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'basic'
                ? 'bg-accent-primary text-white'
                : 'bg-primary-bg-secondary text-text-muted hover:bg-gray-800'
            }`}
          >
            Basic Settings
          </button>
          <button
            onClick={() => setActiveTab('gamerules')}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'gamerules'
                ? 'bg-accent-primary text-white'
                : 'bg-primary-bg-secondary text-text-muted hover:bg-gray-800'
            }`}
          >
            Game Rules
          </button>
          <button
            onClick={() => setActiveTab('border')}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'border'
                ? 'bg-accent-primary text-white'
                : 'bg-primary-bg-secondary text-text-muted hover:bg-gray-800'
            }`}
          >
            World Border
          </button>
        </div>

        {/* Basic Settings Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-2">World Name</label>
              <Input
                value={editedWorld.name}
                onChange={(e) => setEditedWorld({ ...editedWorld, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Difficulty</label>
              <select
                value={editedWorld.difficulty}
                onChange={(e) => setEditedWorld({ ...editedWorld, difficulty: e.target.value as any })}
                className="w-full bg-primary-bg border border-gray-700 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-primary"
              >
                <option value="peaceful">Peaceful</option>
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Environment Type</label>
              <select
                value={editedWorld.type}
                onChange={(e) => setEditedWorld({ ...editedWorld, type: e.target.value as any })}
                className="w-full bg-primary-bg border border-gray-700 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-primary"
              >
                <option value="normal">Normal (Overworld)</option>
                <option value="nether">Nether</option>
                <option value="end">The End</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Seed (read-only)</label>
              <Input value={editedWorld.seed} disabled />
              <p className="text-xs text-text-muted mt-1">World seed cannot be changed after creation</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">Spawn X</label>
                <Input
                  type="number"
                  value={editedWorld.spawn.x}
                  onChange={(e) =>
                    setEditedWorld({
                      ...editedWorld,
                      spawn: { ...editedWorld.spawn, x: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Spawn Y</label>
                <Input
                  type="number"
                  value={editedWorld.spawn.y}
                  onChange={(e) =>
                    setEditedWorld({
                      ...editedWorld,
                      spawn: { ...editedWorld.spawn, y: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Spawn Z</label>
                <Input
                  type="number"
                  value={editedWorld.spawn.z}
                  onChange={(e) =>
                    setEditedWorld({
                      ...editedWorld,
                      spawn: { ...editedWorld.spawn, z: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editedWorld.loaded}
                  onChange={(e) => setEditedWorld({ ...editedWorld, loaded: e.target.checked })}
                  className="w-4 h-4 accent-accent-primary"
                />
                <span className="text-sm text-text-primary">Load world on server start</span>
              </label>
            </div>
          </div>
        )}

        {/* Game Rules Tab */}
        {activeTab === 'gamerules' && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-text-muted mb-4">
              Configure game rules that affect gameplay mechanics in this world
            </p>
            {commonGameRules.map((rule) => (
              <div key={rule.key} className="flex items-center justify-between p-3 rounded-lg bg-primary-bg">
                <span className="text-sm text-text-primary">{rule.label}</span>
                {rule.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={editedWorld.gameRules[rule.key] as boolean}
                    onChange={(e) => updateGameRule(rule.key, e.target.checked)}
                    className="w-4 h-4 accent-accent-primary"
                  />
                ) : (
                  <Input
                    type="number"
                    value={editedWorld.gameRules[rule.key] as number}
                    onChange={(e) => updateGameRule(rule.key, parseInt(e.target.value))}
                    className="w-24"
                  />
                )}
              </div>
            ))}

            {/* Show additional game rules */}
            <div className="pt-4 border-t border-gray-800">
              <p className="text-xs text-text-muted mb-2">Additional Game Rules ({Object.keys(editedWorld.gameRules).length} total)</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(editedWorld.gameRules)
                  .filter((key) => !commonGameRules.find((r) => r.key === key))
                  .map((key) => (
                    <Badge key={key} variant="default" size="sm">
                      {key}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* World Border Tab */}
        {activeTab === 'border' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted mb-4">
              Configure the world border to limit the playable area
            </p>

            <div>
              <label className="block text-sm text-text-muted mb-2">Border Size (blocks)</label>
              <Input
                type="number"
                value={editedWorld.border.size}
                onChange={(e) =>
                  setEditedWorld({
                    ...editedWorld,
                    border: { ...editedWorld.border, size: parseInt(e.target.value) },
                  })
                }
              />
              <p className="text-xs text-text-muted mt-1">Diameter of the world border (default: 60,000,000)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">Center X</label>
                <Input
                  type="number"
                  value={editedWorld.border.center.x}
                  onChange={(e) =>
                    setEditedWorld({
                      ...editedWorld,
                      border: {
                        ...editedWorld.border,
                        center: { ...editedWorld.border.center, x: parseInt(e.target.value) },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Center Z</label>
                <Input
                  type="number"
                  value={editedWorld.border.center.z}
                  onChange={(e) =>
                    setEditedWorld({
                      ...editedWorld,
                      border: {
                        ...editedWorld.border,
                        center: { ...editedWorld.border.center, z: parseInt(e.target.value) },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="p-4 bg-primary-bg rounded-lg border border-gray-700">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Border Info</h4>
              <div className="space-y-1 text-sm text-text-muted">
                <p>• Border radius: {(editedWorld.border.size / 2).toLocaleString()} blocks</p>
                <p>• Total area: {((editedWorld.border.size / 1000) ** 2).toFixed(2)}M blocks²</p>
                <p>• Center point: ({editedWorld.border.center.x}, {editedWorld.border.center.z})</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-800">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
