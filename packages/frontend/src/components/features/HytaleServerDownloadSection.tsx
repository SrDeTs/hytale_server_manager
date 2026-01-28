import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { HytaleOAuthModal } from '../modals/HytaleOAuthModal';
import { HytaleDownloadProgress } from './HytaleDownloadProgress';
import {
  useHytaleDownloaderStore,
  useHytaleDownloaderStatus,
  useHytaleDownloaderDownload,
} from '../../stores/hytaleDownloaderStore';
import {
  Download,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface HytaleServerDownloadSectionProps {
  serverPath: string;
  onVersionSet?: (version: string) => void;
  onDownloadComplete?: () => void;
}

export const HytaleServerDownloadSection = ({
  serverPath,
  onVersionSet,
  onDownloadComplete,
}: HytaleServerDownloadSectionProps) => {
  const { t } = useTranslation();
  const {
    fetchStatus,
    installBinary,
    startDownload,
    checkVersion,
    gameVersion,
    isCheckingVersion,
    isStartingDownload,
    error,
    clearError,
  } = useHytaleDownloaderStore();

  const status = useHytaleDownloaderStatus();
  const downloadSession = useHytaleDownloaderDownload();

  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [selectedPatchline, setSelectedPatchline] = useState('release');
  const [localError, setLocalError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Update version when game version is fetched
  useEffect(() => {
    if (gameVersion?.version && onVersionSet) {
      onVersionSet(gameVersion.version);
    }
  }, [gameVersion?.version, onVersionSet]);

  // Handle download complete
  useEffect(() => {
    if (downloadSession?.status === 'complete') {
      onDownloadComplete?.();
    }
  }, [downloadSession?.status, onDownloadComplete]);

  // Auto-fetch version when prerequisites are met
  useEffect(() => {
    const shouldAutoFetch =
      status?.binaryInstalled &&
      status?.isAuthenticated &&
      !isCheckingVersion &&
      !gameVersion &&
      !downloadSession;

    if (shouldAutoFetch) {
      checkVersion(selectedPatchline).catch(() => {
        // Silent fail for auto-fetch - user can manually retry
      });
    }
  }, [
    status?.binaryInstalled,
    status?.isAuthenticated,
    isCheckingVersion,
    gameVersion,
    downloadSession,
    selectedPatchline,
    checkVersion
  ]);

  const handleInstallBinary = useCallback(async () => {
    setIsInstalling(true);
    setLocalError(null);
    try {
      await installBinary();
    } catch (err: any) {
      setLocalError(err.message || t('hytale_downloader.install.error'));
    } finally {
      setIsInstalling(false);
    }
  }, [installBinary]);

  const handleCheckVersion = useCallback(async () => {
    clearError();
    setLocalError(null);
    try {
      await checkVersion(selectedPatchline);
    } catch (err: any) {
      setLocalError(err.message || t('hytale_downloader.download.errors.check_version'));
    }
  }, [checkVersion, selectedPatchline, clearError, t]);

  const handlePatchlineChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPatchline = e.target.value;
    setSelectedPatchline(newPatchline);

    if (status?.binaryInstalled && status?.isAuthenticated && !isCheckingVersion) {
      clearError();
      setLocalError(null);
      checkVersion(newPatchline).catch((err: any) => {
        setLocalError(err.message || t('hytale_downloader.download.errors.check_version'));
      });
    }
  }, [status, isCheckingVersion, checkVersion, clearError, t]);

  const handleStartDownload = useCallback(async () => {
    if (!serverPath) {
      setLocalError(t('hytale_downloader.download.errors.path_required'));
      return;
    }

    clearError();
    setLocalError(null);
    try {
      await startDownload(serverPath, selectedPatchline);
    } catch (err: any) {
      setLocalError(err.message || t('hytale_downloader.download.errors.start'));
    }
  }, [startDownload, serverPath, selectedPatchline, clearError, t]);

  const handleOAuthSuccess = useCallback(() => {
    fetchStatus();
    setShowOAuthModal(false);
  }, [fetchStatus]);

  const handleCloseOAuthModal = useCallback(() => {
    setShowOAuthModal(false);
  }, []);

  // If binary not installed
  if (!status?.binaryInstalled) {
    return (
      <div className="p-4 bg-primary-bg-secondary rounded-lg space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-text-light-primary dark:text-text-primary mb-1">
              {t('hytale_downloader.install.title')}
            </h4>
            <p className="text-sm text-text-light-muted dark:text-text-muted mb-3">
              {t('hytale_downloader.install.description')}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallBinary}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              {isInstalling ? t('hytale_downloader.install.button_loading') : t('hytale_downloader.install.button')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated
  if (!status?.isAuthenticated) {
    return (
      <>
        <div className="p-4 bg-primary-bg-secondary rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-text-light-primary dark:text-text-primary mb-1">
                {t('hytale_downloader.auth.title')}
              </h4>
              <p className="text-sm text-text-light-muted dark:text-text-muted mb-3">
                {t('hytale_downloader.auth.description')}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowOAuthModal(true)}
              >
                <Key size={16} className="mr-2" />
                {t('hytale_downloader.auth.button')}
              </Button>
            </div>
          </div>
        </div>

        <HytaleOAuthModal
          isOpen={showOAuthModal}
          onClose={handleCloseOAuthModal}
          onSuccess={handleOAuthSuccess}
        />
      </>
    );
  }

  // Show download section
  return (
    <div className="p-4 bg-primary-bg-secondary rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-text-light-primary dark:text-text-primary">
          {t('hytale_downloader.download.title')}
        </h4>
        <div className="flex items-center gap-2 text-sm text-green-500">
          <CheckCircle size={14} />
          <span>{t('hytale_downloader.auth.connected')}</span>
        </div>
      </div>

      {/* Error message */}
      {(error || localError) && (
        <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg flex items-center justify-between">
          <span>{error || localError}</span>
          <button
            onClick={() => {
              clearError();
              setLocalError(null);
            }}
            className="hover:opacity-70"
          >
            &times;
          </button>
        </div>
      )}

        {/* Patchline selector */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            {t('hytale_downloader.download.patchline_label')}
          </label>
          <select
            value={selectedPatchline}
            onChange={handlePatchlineChange}
            className="w-full px-4 py-2 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            disabled={downloadSession ? ['downloading', 'extracting', 'validating'].includes(downloadSession.status) : false}
          >
            <option value="release">{t('hytale_downloader.download.patchline_release')}</option>
            <option value="pre-release">{t('hytale_downloader.download.patchline_prerelease')}</option>
          </select>
        </div>

      {/* Version info */}
      {gameVersion && (
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-light-secondary dark:text-text-secondary">
              {t('hytale_downloader.download.available_version')}
            </span>
            <span className="text-sm font-mono text-green-500">
              {gameVersion.version}
            </span>
          </div>
        </div>
      )}

      {/* Download progress */}
      {downloadSession && (
        <HytaleDownloadProgress
          onComplete={onDownloadComplete}
          showCancel={downloadSession.status !== 'complete' && downloadSession.status !== 'failed'}
        />
      )}

      {/* Actions */}
      {(!downloadSession || downloadSession.status === 'failed' || downloadSession.status === 'complete') && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCheckVersion}
            disabled={isCheckingVersion}
          >
            {isCheckingVersion ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <RefreshCw size={16} className="mr-2" />
            )}
            {isCheckingVersion ? t('hytale_downloader.download.actions.checking') : t('hytale_downloader.download.actions.refresh')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartDownload}
            disabled={isStartingDownload || !serverPath}
          >
            {isStartingDownload ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            {isStartingDownload ? t('hytale_downloader.download.actions.starting') : t('hytale_downloader.download.actions.download')}
          </Button>
        </div>
      )}

      {!serverPath && (
        <p className="text-xs text-text-light-muted dark:text-text-muted">
          {t('hytale_downloader.download.path_hint')}
        </p>
      )}
    </div>
  );
};
