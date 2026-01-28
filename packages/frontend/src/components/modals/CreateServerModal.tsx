import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Button, Input } from '../ui';
import { Server as ServerIcon } from 'lucide-react';
import { HytaleServerDownloadSection } from '../features/HytaleServerDownloadSection';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServerFormData) => Promise<void>;
}

export interface ServerFormData {
  name: string;
  serverPath: string;
  address: string;
  port: number;
  version: string;
  maxPlayers: number;
  gameMode: string;
  adapterType: string;
  jvmArgs?: string;
  adapterConfig?: {
    jarFile?: string;
    assetsPath?: string;
    javaPath?: string;
  };
}

export const CreateServerModal = ({ isOpen, onClose, onSubmit }: CreateServerModalProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    serverPath: '',
    address: '0.0.0.0',
    port: 5520,
    version: '',
    maxPlayers: 20,
    gameMode: 'expedition',
    adapterType: 'java',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ServerFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ServerFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('servers.create.errors.name');
    }

    if (!formData.serverPath.trim()) {
      newErrors.serverPath = t('servers.create.errors.server_path');
    }

    if (!formData.address.trim()) {
      newErrors.address = t('servers.create.errors.address');
    }

    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = t('servers.create.errors.port');
    }

    if (!formData.version.trim()) {
      newErrors.version = t('servers.create.errors.version');
    }

    if (!formData.gameMode.trim()) {
      newErrors.gameMode = t('servers.create.errors.game_mode');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error creating server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      serverPath: '',
      address: '0.0.0.0',
      port: 5520,
      version: '',
      maxPlayers: 20,
      gameMode: 'expedition',
      adapterType: 'java',
    });
    setErrors({});
    onClose();
  };

  const updateField = (field: keyof ServerFormData, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generate serverPath when name changes
      if (field === 'name' && typeof value === 'string') {
        const slugifiedName = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (slugifiedName) {
          updated.serverPath = `servers/${slugifiedName}`;
        } else {
          updated.serverPath = '';
        }
      }

      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('servers.create.title')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Server Icon Header */}
        <div className="flex items-center gap-3 p-4 bg-primary-bg-secondary rounded-lg">
          <div className="p-3 bg-accent-primary/20 rounded-lg">
            <ServerIcon className="text-accent-primary" size={24} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-text-light-primary dark:text-text-primary">
              {t('servers.create.header')}
            </h3>
            <p className="text-sm text-text-light-muted dark:text-text-muted">
              {t('servers.create.subtitle')}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Server Name */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              {t('servers.create.name_label')} *
            </label>
            <Input
              type="text"
              placeholder={t('servers.create.name_placeholder')}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
            {errors.name && (
              <p className="text-danger text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Server Directory Path */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              {t("servers.create.path_label")} *
            </label>
            <Input
              type="text"
              placeholder={t("servers.create.path_placeholder")}
              value={formData.serverPath}
              onChange={(e) => updateField('serverPath', e.target.value)}
            />
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              {t('servers.create.path_help')}
            </p>
            {errors.serverPath && (
              <p className="text-danger text-sm mt-1">{errors.serverPath}</p>
            )}
          </div>

          {/* Hytale Server Download */}
          <HytaleServerDownloadSection
            serverPath={formData.serverPath}
            onVersionSet={(version) => updateField('version', version)}
          />
          {errors.version && (
            <p className="text-danger text-sm mt-1">{errors.version}</p>
          )}

          {/* Address and Port */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                {t('servers.create.address_label')} *
              </label>
              <Input
                type="text"
                placeholder="0.0.0.0"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
              {errors.address && (
                <p className="text-danger text-sm mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                {t('servers.create.port_label')} *
              </label>
              <Input
                type="number"
                placeholder="25565"
                value={formData.port}
                onChange={(e) => updateField('port', parseInt(e.target.value) || 0)}
              />
              {errors.port && (
                <p className="text-danger text-sm mt-1">{errors.port}</p>
              )}
            </div>
          </div>

          {/* Game Mode */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              {t('servers.create.gamemode_label')} *
            </label>
            <select
              value={formData.gameMode}
              onChange={(e) => updateField('gameMode', e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            >
              <option value="expedition">{t('servers.create.gamemodes.expedition')}</option>
              <option value="creative">{t('servers.create.gamemodes.creative')}</option>
            </select>
            {errors.gameMode && (
              <p className="text-danger text-sm mt-1">{errors.gameMode}</p>
            )}
          </div>

          {/* Adapter Type */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              {t('servers.create.adapter.label')}
            </label>
            <select
              value={formData.adapterType}
              onChange={(e) => {
                updateField('adapterType', e.target.value);
                // Set default adapter config for java
                if (e.target.value === 'java') {
                  setFormData(prev => ({
                    ...prev,
                    adapterType: 'java',
                    jvmArgs: '-Xms1G -Xmx2G -XX:AOTCache=HytaleServer.aot',
                    adapterConfig: {
                      jarFile: 'Server/HytaleServer.jar',
                      assetsPath: '../Assets.zip',
                      javaPath: 'java',
                    },
                  }));
                } else {
                  setFormData(prev => ({
                    ...prev,
                    adapterType: e.target.value,
                    jvmArgs: undefined,
                    adapterConfig: undefined,
                  }));
                }
              }}
              className="w-full px-4 py-2 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            >
              <option value="java">{t('servers.create.adapter.java')}</option>
              <option value="hytale" disabled>{t('servers.create.adapter.hytale')}</option>
            </select>
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              {formData.adapterType === 'java' && t('servers.create.adapter.java_help')}
            </p>
          </div>

          {/* Java Adapter Config */}
          {formData.adapterType === 'java' && (
            <div className="space-y-4 p-4 bg-primary-bg-secondary rounded-lg">
              <h4 className="font-medium text-text-light-primary dark:text-text-primary">{t('servers.create.java.title')}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                    {t('servers.create.java.jar_label')}
                  </label>
                  <Input
                    type="text"
                    placeholder="Server/HytaleServer.jar"
                    value={formData.adapterConfig?.jarFile || 'Server/HytaleServer.jar'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adapterConfig: { ...prev.adapterConfig, jarFile: e.target.value },
                    }))}
                  />
                  <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                    {t('servers.create.java.jar_help')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                    {t('servers.create.java.assets_label')}
                  </label>
                  <Input
                    type="text"
                    placeholder="../Assets.zip"
                    value={formData.adapterConfig?.assetsPath || '../Assets.zip'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adapterConfig: { ...prev.adapterConfig, assetsPath: e.target.value },
                    }))}
                  />
                  <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                    {t('servers.create.java.assets_help')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                    {t('servers.create.java.java_label')}
                  </label>
                  <Input
                    type="text"
                    placeholder="java"
                    value={formData.adapterConfig?.javaPath || 'java'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adapterConfig: { ...prev.adapterConfig, javaPath: e.target.value },
                    }))}
                  />
                  <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                    {t('servers.create.java.java_help')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
                  {t('servers.create.java.jvm_label')}
                </label>
                <textarea
                  placeholder="-Xms1G -Xmx2G -XX:AOTCache=HytaleServer.aot"
                  value={formData.jvmArgs || '-Xms1G -Xmx2G -XX:AOTCache=HytaleServer.aot'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    jvmArgs: e.target.value,
                  }))}
                  className="w-full px-4 py-2 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 font-mono text-sm"
                  rows={2}
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  {t('servers.create.java.jvm_help')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? t('common.creating') : t('servers.create.submit')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
