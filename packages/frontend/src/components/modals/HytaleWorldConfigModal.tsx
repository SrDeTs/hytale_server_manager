import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input } from '../ui';
import {
  ChevronDown,
  ChevronRight,
  Swords,
  Clock,
  Settings,
  Info,
  AlertTriangle,
  Loader2,
  Code,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../stores/toastStore';

/**
 * Hytale World Config structure
 */
export interface HytaleWorldConfig {
  // Read-only fields
  Version?: number;
  UUID?: { $binary: string; $type: string };
  Seed?: number;
  WorldGen?: { Type?: string; Name?: string };
  GameplayConfig?: string;

  // Gameplay settings
  IsPvpEnabled?: boolean;
  IsFallDamageEnabled?: boolean;
  IsSpawningNPC?: boolean;
  IsAllNPCFrozen?: boolean;
  IsSpawnMarkersEnabled?: boolean;
  IsObjectiveMarkersEnabled?: boolean;
  IsCompassUpdating?: boolean;

  // Time & Effects
  IsGameTimePaused?: boolean;
  GameTime?: string;
  ClientEffects?: {
    SunHeightPercent?: number;
    SunAngleDegrees?: number;
    SunIntensity?: number;
    BloomIntensity?: number;
    BloomPower?: number;
    SunshaftIntensity?: number;
    SunshaftScaleFactor?: number;
    [key: string]: unknown;
  };

  // World Management
  IsTicking?: boolean;
  IsBlockTicking?: boolean;
  IsSavingPlayers?: boolean;
  IsSavingChunks?: boolean;
  SaveNewChunks?: boolean;
  IsUnloadingChunks?: boolean;
  DeleteOnUniverseStart?: boolean;
  DeleteOnRemove?: boolean;

  [key: string]: unknown;
}

interface World {
  id: string;
  serverId: string;
  name: string;
  folderPath: string;
  sizeBytes: number;
  isActive: boolean;
}

interface HytaleWorldConfigModalProps {
  world: World;
  serverStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, icon, children, defaultOpen = true }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="text-text-light-muted dark:text-text-muted">{icon}</span>
        <span className="font-medium text-text-light-primary dark:text-text-primary">{title}</span>
      </button>
      {isOpen && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSetting = ({ label, description, checked, onChange, disabled }: ToggleSettingProps) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
    <div className="flex-1 mr-4">
      <span className="text-sm font-medium text-text-light-primary dark:text-text-primary">{label}</span>
      {description && (
        <p className="text-xs text-text-light-muted dark:text-text-muted mt-0.5">{description}</p>
      )}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-5 h-5 accent-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

interface NumberSettingProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const NumberSetting = ({ label, description, value, onChange, disabled, min, max, step = 0.1 }: NumberSettingProps) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
    <div className="flex-1 mr-4">
      <span className="text-sm font-medium text-text-light-primary dark:text-text-primary">{label}</span>
      {description && (
        <p className="text-xs text-text-light-muted dark:text-text-muted mt-0.5">{description}</p>
      )}
    </div>
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className="w-24 text-right"
    />
  </div>
);

interface ReadOnlyFieldProps {
  label: string;
  value: string | number | undefined;
}

const ReadOnlyField = ({ label, value }: ReadOnlyFieldProps) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
    <span className="text-sm text-text-light-muted dark:text-text-muted">{label}</span>
    <span className="text-sm font-mono text-text-light-primary dark:text-text-primary">
      {value ?? 'N/A'}
    </span>
  </div>
);

export const HytaleWorldConfigModal = ({
  world,
  serverStatus,
  isOpen,
  onClose,
  onSaved,
}: HytaleWorldConfigModalProps) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<HytaleWorldConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isServerRunning = serverStatus === 'running';
  const isDisabled = isServerRunning;

  // Load config when modal opens
  useEffect(() => {
    if (isOpen && world) {
      loadConfig();
    }
  }, [isOpen, world]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    setJsonError(null);
    try {
      const data = await api.getWorldConfig<HytaleWorldConfig>(world.serverId, world.id);
      setConfig(data);
      setJsonText(JSON.stringify(data, null, 2));
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load world config');
    } finally {
      setLoading(false);
    }
  };

  // Handle switching from JSON to form view - parse and apply JSON changes
  const switchToFormView = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        setConfig(parsed);
        setJsonError(null);
        setViewMode('form');
      } catch (err: any) {
        setJsonError('Invalid JSON: ' + err.message);
      }
    }
  };

  // Handle switching from form to JSON view - serialize current config
  const switchToJsonView = () => {
    if (viewMode === 'form' && config) {
      setJsonText(JSON.stringify(config, null, 2));
      setJsonError(null);
      setViewMode('json');
    }
  };

  // Handle JSON text changes
  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setHasChanges(true);
    setJsonError(null);
    // Try to validate JSON as user types
    try {
      JSON.parse(text);
    } catch {
      // Don't show error while typing, only on switch
    }
  };

  const updateConfig = <K extends keyof HytaleWorldConfig>(key: K, value: HytaleWorldConfig[K]) => {
    if (!config) return;
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setHasChanges(true);
  };

  const updateClientEffect = (key: string, value: number) => {
    if (!config) return;
    const newConfig = {
      ...config,
      ClientEffects: {
        ...config.ClientEffects,
        [key]: value,
      },
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setHasChanges(true);
  };

  const handleSave = async () => {
    let configToSave: HytaleWorldConfig | null = config;

    // If in JSON mode, parse the JSON first
    if (viewMode === 'json') {
      try {
        configToSave = JSON.parse(jsonText);
        setJsonError(null);
      } catch (err: any) {
        setJsonError('Invalid JSON: ' + err.message);
        return;
      }
    }

    if (!configToSave) return;

    setSaving(true);
    try {
      await api.updateWorldConfig(world.serverId, world.id, configToSave);
      toast.success('Config saved', 'World configuration has been updated');
      setHasChanges(false);
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error('Failed to save config', err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`World Config - ${world.name}`} size="lg">
      {/* Server Running Warning */}
      {isServerRunning && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-500">Server is running</p>
            <p className="text-xs text-amber-500/80">
              Stop the server to edit world configuration
            </p>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      {!loading && !error && config && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={switchToFormView}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'form'
                ? 'bg-accent-primary text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-text-light-muted dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal size={16} />
            Form
          </button>
          <button
            onClick={switchToJsonView}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'json'
                ? 'bg-accent-primary text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-text-light-muted dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Code size={16} />
            JSON
          </button>
        </div>
      )}

      {/* JSON Error */}
      {jsonError && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
          <p className="text-sm text-red-500">{jsonError}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-accent-primary" size={32} />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="secondary" onClick={loadConfig}>
            Retry
          </Button>
        </div>
      ) : config && viewMode === 'json' ? (
        <div className="max-h-[60vh] overflow-hidden">
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            disabled={isDisabled}
            className="w-full h-[60vh] p-4 font-mono text-sm bg-gray-900 text-gray-100 border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            spellCheck={false}
          />
        </div>
      ) : config ? (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Gameplay Section */}
          <CollapsibleSection title="Gameplay" icon={<Swords size={18} />}>
            <ToggleSetting
              label="PvP Enabled"
              description="Allow players to damage each other"
              checked={config.IsPvpEnabled ?? true}
              onChange={(v) => updateConfig('IsPvpEnabled', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Fall Damage"
              description="Players take damage from falling"
              checked={config.IsFallDamageEnabled ?? true}
              onChange={(v) => updateConfig('IsFallDamageEnabled', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="NPC Spawning"
              description="Allow NPCs to spawn in the world"
              checked={config.IsSpawningNPC ?? true}
              onChange={(v) => updateConfig('IsSpawningNPC', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Freeze All NPCs"
              description="Prevent all NPCs from moving"
              checked={config.IsAllNPCFrozen ?? false}
              onChange={(v) => updateConfig('IsAllNPCFrozen', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Spawn Markers"
              description="Show spawn point markers"
              checked={config.IsSpawnMarkersEnabled ?? true}
              onChange={(v) => updateConfig('IsSpawnMarkersEnabled', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Objective Markers"
              description="Show objective markers on HUD"
              checked={config.IsObjectiveMarkersEnabled ?? true}
              onChange={(v) => updateConfig('IsObjectiveMarkersEnabled', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Compass Updating"
              description="Allow compass to update direction"
              checked={config.IsCompassUpdating ?? true}
              onChange={(v) => updateConfig('IsCompassUpdating', v)}
              disabled={isDisabled}
            />
          </CollapsibleSection>

          {/* Time & Effects Section */}
          <CollapsibleSection title="Time & Effects" icon={<Clock size={18} />}>
            <ToggleSetting
              label="Game Time Paused"
              description="Freeze the day/night cycle"
              checked={config.IsGameTimePaused ?? false}
              onChange={(v) => updateConfig('IsGameTimePaused', v)}
              disabled={isDisabled}
            />
            {config.ClientEffects && (
              <>
                <NumberSetting
                  label="Sun Height %"
                  description="Vertical position of the sun (0-100%)"
                  value={config.ClientEffects.SunHeightPercent ?? 100}
                  onChange={(v) => updateClientEffect('SunHeightPercent', v)}
                  disabled={isDisabled}
                  min={0}
                  max={100}
                  step={1}
                />
                <NumberSetting
                  label="Sun Angle"
                  description="Rotation angle of the sun in degrees"
                  value={config.ClientEffects.SunAngleDegrees ?? 0}
                  onChange={(v) => updateClientEffect('SunAngleDegrees', v)}
                  disabled={isDisabled}
                  min={0}
                  max={360}
                  step={1}
                />
                <NumberSetting
                  label="Sun Intensity"
                  description="Brightness of the sun"
                  value={config.ClientEffects.SunIntensity ?? 0.25}
                  onChange={(v) => updateClientEffect('SunIntensity', v)}
                  disabled={isDisabled}
                  min={0}
                  max={2}
                />
                <NumberSetting
                  label="Bloom Intensity"
                  description="Post-processing bloom effect"
                  value={config.ClientEffects.BloomIntensity ?? 0.3}
                  onChange={(v) => updateClientEffect('BloomIntensity', v)}
                  disabled={isDisabled}
                  min={0}
                  max={2}
                />
                <NumberSetting
                  label="Bloom Power"
                  description="Bloom effect power"
                  value={config.ClientEffects.BloomPower ?? 8}
                  onChange={(v) => updateClientEffect('BloomPower', v)}
                  disabled={isDisabled}
                  min={0}
                  max={16}
                  step={1}
                />
              </>
            )}
          </CollapsibleSection>

          {/* World Management Section */}
          <CollapsibleSection title="World Management" icon={<Settings size={18} />}>
            <ToggleSetting
              label="World Ticking"
              description="Enable world simulation updates"
              checked={config.IsTicking ?? true}
              onChange={(v) => updateConfig('IsTicking', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Block Ticking"
              description="Enable random block updates"
              checked={config.IsBlockTicking ?? true}
              onChange={(v) => updateConfig('IsBlockTicking', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Save Players"
              description="Persist player data to disk"
              checked={config.IsSavingPlayers ?? true}
              onChange={(v) => updateConfig('IsSavingPlayers', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Save Chunks"
              description="Persist chunk data to disk"
              checked={config.IsSavingChunks ?? true}
              onChange={(v) => updateConfig('IsSavingChunks', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Save New Chunks"
              description="Save newly generated chunks"
              checked={config.SaveNewChunks ?? true}
              onChange={(v) => updateConfig('SaveNewChunks', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Unload Chunks"
              description="Unload inactive chunks from memory"
              checked={config.IsUnloadingChunks ?? true}
              onChange={(v) => updateConfig('IsUnloadingChunks', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Delete on Universe Start"
              description="Remove world when universe starts"
              checked={config.DeleteOnUniverseStart ?? false}
              onChange={(v) => updateConfig('DeleteOnUniverseStart', v)}
              disabled={isDisabled}
            />
            <ToggleSetting
              label="Delete on Remove"
              description="Delete world files when removed"
              checked={config.DeleteOnRemove ?? false}
              onChange={(v) => updateConfig('DeleteOnRemove', v)}
              disabled={isDisabled}
            />
          </CollapsibleSection>

          {/* Info Section (Read-only) */}
          <CollapsibleSection title="Info (Read-only)" icon={<Info size={18} />} defaultOpen={false}>
            <ReadOnlyField label="Version" value={config.Version} />
            <ReadOnlyField label="Seed" value={config.Seed} />
            <ReadOnlyField label="World Generator" value={config.WorldGen?.Name} />
            <ReadOnlyField label="Gameplay Config" value={config.GameplayConfig} />
          </CollapsibleSection>
        </div>
      ) : null}

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isDisabled || saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
