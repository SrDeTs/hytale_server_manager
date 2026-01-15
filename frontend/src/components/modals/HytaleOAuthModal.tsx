import { useEffect, useState, useCallback } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  useHytaleDownloaderStore,
  useHytaleDownloaderOAuth,
} from '../../stores/hytaleDownloaderStore';
import {
  Key,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface HytaleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const HytaleOAuthModal = ({ isOpen, onClose, onSuccess }: HytaleOAuthModalProps) => {
  const {
    fetchStatus,
    startOAuth,
    cancelOAuth,
    isStartingOAuth,
    error,
    clearError,
  } = useHytaleDownloaderStore();

  const oauthSession = useHytaleDownloaderOAuth();
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Start OAuth when modal opens
  useEffect(() => {
    if (isOpen && !oauthSession && !isStartingOAuth) {
      clearError();
      startOAuth().catch(() => {});
    }
  }, [isOpen, oauthSession, isStartingOAuth, startOAuth, clearError]);

  // Countdown timer
  useEffect(() => {
    if (!oauthSession?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(oauthSession.expiresAt);
      const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
      setTimeRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [oauthSession?.expiresAt]);

  // Handle success
  useEffect(() => {
    if (oauthSession?.status === 'completed') {
      onSuccess?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthSession?.status]);

  const handleCopyCode = useCallback(() => {
    if (oauthSession?.deviceCode) {
      navigator.clipboard.writeText(oauthSession.deviceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [oauthSession?.deviceCode]);

  const handleRetry = useCallback(() => {
    clearError();
    cancelOAuth();
    startOAuth().catch(() => {});
  }, [clearError, cancelOAuth, startOAuth]);

  const handleClose = useCallback(() => {
    cancelOAuth();
    onClose();
  }, [cancelOAuth, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    // Loading state
    if (isStartingOAuth || (oauthSession?.status === 'pending' && !oauthSession?.deviceCode)) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
          <p className="text-text-light-secondary dark:text-text-secondary">
            Initiating authentication...
          </p>
        </div>
      );
    }

    // Error state
    if (error || oauthSession?.status === 'failed') {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-primary mb-2">
              Authentication Failed
            </h3>
            <p className="text-text-light-muted dark:text-text-muted">
              {error || oauthSession?.error || 'An error occurred during authentication.'}
            </p>
          </div>
          <Button onClick={handleRetry} variant="primary">
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    // Expired state
    if (oauthSession?.status === 'expired' || (timeRemaining !== null && timeRemaining <= 0)) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-primary mb-2">
              Code Expired
            </h3>
            <p className="text-text-light-muted dark:text-text-muted">
              The device code has expired. Please try again.
            </p>
          </div>
          <Button onClick={handleRetry} variant="primary">
            <RefreshCw size={16} className="mr-2" />
            Get New Code
          </Button>
        </div>
      );
    }

    // Success state
    if (oauthSession?.status === 'completed') {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-primary mb-2">
              Authentication Successful
            </h3>
            <p className="text-text-light-muted dark:text-text-muted">
              Your Hytale account has been connected.
            </p>
          </div>
        </div>
      );
    }

    // Polling state - show device code
    if (oauthSession?.deviceCode && oauthSession?.verificationUrl) {
      return (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="text-center">
            <p className="text-text-light-secondary dark:text-text-secondary mb-4">
              To connect your Hytale account, open the verification link and enter the code below.
            </p>
          </div>

          {/* Device Code */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-6 text-center">
            <p className="text-sm text-text-light-muted dark:text-text-muted mb-2">
              Your device code
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-mono font-bold tracking-wider text-accent-primary">
                {oauthSession.deviceCode}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </Button>
            </div>
            {timeRemaining !== null && (
              <p className="text-sm text-text-light-muted dark:text-text-muted mt-3">
                Expires in{' '}
                <span className={timeRemaining < 60 ? 'text-yellow-500' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </p>
            )}
          </div>

          {/* Verification Link */}
          <div className="text-center">
            <a
              href={oauthSession.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              Open Hytale Login
            </a>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-text-light-muted dark:text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span>Waiting for authentication...</span>
          </div>
        </div>
      );
    }

    // Fallback loading
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
        <p className="text-text-light-secondary dark:text-text-secondary">
          Preparing authentication...
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Connect Hytale Account" size="sm">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-accent-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-light-primary dark:text-text-primary">
            Hytale Authentication
          </h3>
          <p className="text-xs text-text-light-muted dark:text-text-muted">
            Required to download official server files
          </p>
        </div>
      </div>

      {renderContent()}

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
