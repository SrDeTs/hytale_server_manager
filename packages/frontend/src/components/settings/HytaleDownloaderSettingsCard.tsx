import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, TokenExpiryBadge } from '../ui';
import { HytaleOAuthModal } from '../modals/HytaleOAuthModal';
import {
  useHytaleDownloaderStore,
  useHytaleDownloaderStatus,
  useHytaleDownloaderLoading,
  useHytaleDownloaderError,
} from '../../stores/hytaleDownloaderStore';
import {
  Download,
  RefreshCw,
  Check,
  X,
  Key,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

export const HytaleDownloaderSettingsCard = () => {
  const {
    fetchStatus,
    installBinary,
    updateBinary,
    clearCredentials,
    clearError,
    refreshToken,
    isRefreshingToken,
    setAutoRefresh,
    isUpdatingAutoRefresh,
  } = useHytaleDownloaderStore();

  const status = useHytaleDownloaderStatus();
  const isLoading = useHytaleDownloaderLoading();
  const error = useHytaleDownloaderError();

  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isClearingCredentials, setIsClearingCredentials] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      await installBinary();
      setLocalSuccess('Hytale Downloader installed successfully!');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to install');
    } finally {
      setIsInstalling(false);
    }
  }, [installBinary]);

  const handleUpdate = useCallback(async () => {
    setIsInstalling(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      await updateBinary();
      setLocalSuccess('Hytale Downloader updated successfully!');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update');
    } finally {
      setIsInstalling(false);
    }
  }, [updateBinary]);

  const handleClearCredentials = useCallback(async () => {
    if (!confirm('Are you sure you want to disconnect your Hytale account?')) {
      return;
    }

    setIsClearingCredentials(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      await clearCredentials();
      setLocalSuccess('Hytale account disconnected.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to clear credentials');
    } finally {
      setIsClearingCredentials(false);
    }
  }, [clearCredentials]);

  const handleOAuthSuccess = useCallback(() => {
    setLocalSuccess('Hytale account connected successfully!');
    setShowOAuthModal(false);
    fetchStatus();
  }, [fetchStatus]);

  const handleRefreshToken = useCallback(async () => {
    setLocalError(null);
    setLocalSuccess(null);

    try {
      await refreshToken();
      setLocalSuccess('Token refreshed successfully!');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to refresh token');
    }
  }, [refreshToken]);

  const handleToggleAutoRefresh = useCallback(async () => {
    setLocalError(null);
    setLocalSuccess(null);

    const newEnabled = !status?.autoRefresh?.enabled;

    try {
      await setAutoRefresh(newEnabled, 1800); // 30 minutes
      setLocalSuccess(newEnabled ? 'Auto-refresh enabled!' : 'Auto-refresh disabled!');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update auto-refresh settings');
    }
  }, [setAutoRefresh, status?.autoRefresh?.enabled]);

  return (
    <>
      <Card id="hytale-downloader">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} />
                Hytale Server Downloader
              </CardTitle>
              <CardDescription>
                Download official Hytale server files using your Hytale account
              </CardDescription>
            </div>
            {status?.binaryInstalled && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Installed
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Error message */}
          {(error || localError) && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} />
                {error || localError}
              </span>
              <button
                onClick={() => {
                  clearError();
                  setLocalError(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Success message */}
          {localSuccess && (
            <div className="bg-green-500/10 text-green-500 p-3 rounded mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check size={16} />
                {localSuccess}
              </span>
              <button onClick={() => setLocalSuccess(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          {isLoading && !status ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
              <span className="ml-2 text-text-light-secondary dark:text-text-secondary">
                Loading status...
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Binary Status */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <h4 className="font-medium text-text-light-primary dark:text-text-primary mb-3">
                  Downloader Tool
                </h4>

                {status?.binaryInstalled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-light-secondary dark:text-text-secondary">
                        Version
                      </span>
                      <span className="text-sm font-mono text-text-light-primary dark:text-text-primary">
                        {status.binaryVersion || 'Unknown'}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isInstalling}
                    >
                      {isInstalling ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <RefreshCw size={16} className="mr-2" />
                      )}
                      {isInstalling ? 'Updating...' : 'Check for Updates'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-text-light-muted dark:text-text-muted">
                      The Hytale Downloader tool is not installed. Install it to download official server files.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleInstall}
                      disabled={isInstalling}
                    >
                      {isInstalling ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Download size={16} className="mr-2" />
                      )}
                      {isInstalling ? 'Installing...' : 'Install Downloader'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Authentication Status */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <h4 className="font-medium text-text-light-primary dark:text-text-primary mb-3">
                  Hytale Account
                </h4>

                {status?.isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-500">
                      <Check size={16} />
                      <span className="text-sm">Connected</span>
                    </div>
                    {status.accountEmail && (
                      <p className="text-sm text-text-light-muted dark:text-text-muted">
                        Account: {status.accountEmail}
                      </p>
                    )}

                    {/* Token Status */}
                    {status.tokenInfo && (
                      <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                        <h5 className="text-xs font-medium text-text-light-secondary dark:text-text-secondary uppercase tracking-wide">
                          Token Status
                        </h5>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-light-muted dark:text-text-muted">
                            Access Token
                          </span>
                          <TokenExpiryBadge
                            expiresIn={status.tokenInfo.accessTokenExpiresIn}
                            isExpired={status.tokenInfo.isAccessTokenExpired}
                            warningThreshold={300}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-light-muted dark:text-text-muted">
                            Refresh Token
                          </span>
                          <TokenExpiryBadge
                            expiresIn={status.tokenInfo.refreshTokenExpiresIn}
                            isExpired={status.tokenInfo.isRefreshTokenExpired}
                            warningThreshold={86400}
                          />
                        </div>

                        {status.tokenInfo.branch && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-light-muted dark:text-text-muted">
                              Branch
                            </span>
                            <span className="text-sm text-text-light-primary dark:text-text-primary">
                              {status.tokenInfo.branch}
                            </span>
                          </div>
                        )}

                        {/* Auto-refresh toggle */}
                        <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-text-light-muted dark:text-text-muted" />
                            <span className="text-sm text-text-light-muted dark:text-text-muted">
                              Auto-refresh (30 min)
                            </span>
                          </div>
                          <button
                            onClick={handleToggleAutoRefresh}
                            disabled={isUpdatingAutoRefresh}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              status.autoRefresh?.enabled
                                ? 'bg-accent-primary'
                                : 'bg-gray-300 dark:bg-gray-600'
                            } ${isUpdatingAutoRefresh ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                status.autoRefresh?.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleRefreshToken}
                            disabled={isRefreshingToken}
                            className="flex-1"
                          >
                            {isRefreshingToken ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <RefreshCw size={16} className="mr-2" />
                            )}
                            {isRefreshingToken ? 'Refreshing...' : 'Refresh Now'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowOAuthModal(true)}
                        disabled={!status?.binaryInstalled}
                      >
                        <Key size={16} className="mr-2" />
                        Reconnect
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleClearCredentials}
                        disabled={isClearingCredentials}
                        className="text-red-500 hover:text-red-400"
                      >
                        {isClearingCredentials ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Trash2 size={16} className="mr-2" />
                        )}
                        {isClearingCredentials ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-text-light-muted dark:text-text-muted">
                      Connect your Hytale account to download official server files.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setShowOAuthModal(true)}
                      disabled={!status?.binaryInstalled}
                    >
                      <Key size={16} className="mr-2" />
                      Connect Hytale Account
                    </Button>
                    {!status?.binaryInstalled && (
                      <p className="text-xs text-text-light-muted dark:text-text-muted">
                        Install the downloader tool first to connect your account.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 text-blue-400 p-3 rounded text-sm">
                <p>
                  The Hytale Downloader uses OAuth to authenticate with your Hytale account.
                  Your credentials are stored locally and are never sent to third parties.
                </p>
                <a
                  href="https://support.hytale.com/hc/en-us/articles/45326769420827-Hytale-Server-Manual"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-accent-primary hover:underline"
                >
                  View Hytale Server Manual
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <HytaleOAuthModal
        isOpen={showOAuthModal}
        onClose={() => setShowOAuthModal(false)}
        onSuccess={handleOAuthSuccess}
      />
    </>
  );
};
