import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { hytaleDownloaderService } from '../services/HytaleDownloaderService';
import { PERMISSIONS } from '../permissions/definitions';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/hytale-downloader/status
 * Get the current status of the hytale-downloader
 */
router.get(
  '/status',
  requirePermission(PERMISSIONS.HYTALE_DL_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const status = await hytaleDownloaderService.getStatus();
      res.json(status);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error getting status:', error);
      res.status(500).json({ error: 'Failed to get status', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/install
 * Download and install the hytale-downloader binary
 */
router.post(
  '/install',
  requirePermission(PERMISSIONS.HYTALE_DL_MANAGE),
  async (_req: Request, res: Response) => {
    try {
      await hytaleDownloaderService.installBinary();
      const status = await hytaleDownloaderService.getStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error installing binary:', error);
      res.status(500).json({ error: 'Failed to install binary', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/update
 * Update the hytale-downloader binary
 */
router.post(
  '/update',
  requirePermission(PERMISSIONS.HYTALE_DL_MANAGE),
  async (_req: Request, res: Response) => {
    try {
      // Reinstall to update
      await hytaleDownloaderService.installBinary();
      const status = await hytaleDownloaderService.getStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error updating binary:', error);
      res.status(500).json({ error: 'Failed to update binary', message: error.message });
    }
  }
);

/**
 * GET /api/hytale-downloader/check-update
 * Check if a newer version of the tool is available
 */
router.get(
  '/check-update',
  requirePermission(PERMISSIONS.HYTALE_DL_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const result = await hytaleDownloaderService.checkToolUpdate();
      res.json(result);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error checking for updates:', error);
      res.status(500).json({ error: 'Failed to check for updates', message: error.message });
    }
  }
);

/**
 * GET /api/hytale-downloader/versions
 * Get available game versions
 */
router.get(
  '/versions',
  requirePermission(PERMISSIONS.HYTALE_DL_VIEW),
  async (req: Request, res: Response) => {
    try {
      const patchline = req.query.patchline as string | undefined;
      const version = await hytaleDownloaderService.getGameVersion(patchline);

      if (!version) {
        res.status(404).json({ error: 'Could not retrieve version information' });
        return;
      }

      res.json(version);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error getting versions:', error);
      res.status(500).json({ error: 'Failed to get versions', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/auth/start
 * Start the OAuth device code flow
 */
router.post(
  '/auth/start',
  requirePermission(PERMISSIONS.HYTALE_DL_AUTH),
  async (_req: Request, res: Response) => {
    try {
      const session = await hytaleDownloaderService.startOAuthFlow();
      res.json(session);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error starting OAuth:', error);
      res.status(500).json({ error: 'Failed to start OAuth flow', message: error.message });
    }
  }
);

/**
 * GET /api/hytale-downloader/auth/status/:sessionId
 * Get the status of an OAuth session
 */
router.get(
  '/auth/status/:sessionId',
  requirePermission(PERMISSIONS.HYTALE_DL_AUTH),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = hytaleDownloaderService.getOAuthSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error getting OAuth status:', error);
      res.status(500).json({ error: 'Failed to get OAuth status', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/auth/cancel/:sessionId
 * Cancel an OAuth flow
 */
router.post(
  '/auth/cancel/:sessionId',
  requirePermission(PERMISSIONS.HYTALE_DL_AUTH),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      hytaleDownloaderService.cancelOAuthFlow(sessionId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error cancelling OAuth:', error);
      res.status(500).json({ error: 'Failed to cancel OAuth flow', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/auth/clear
 * Clear stored credentials
 */
router.post(
  '/auth/clear',
  requirePermission(PERMISSIONS.HYTALE_DL_MANAGE),
  async (_req: Request, res: Response) => {
    try {
      await hytaleDownloaderService.clearCredentials();
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error clearing credentials:', error);
      res.status(500).json({ error: 'Failed to clear credentials', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/auth/refresh
 * Refresh the OAuth token
 */
router.post(
  '/auth/refresh',
  requirePermission(PERMISSIONS.HYTALE_DL_AUTH),
  async (_req: Request, res: Response) => {
    try {
      const tokenInfo = await hytaleDownloaderService.refreshToken();
      res.json({ success: true, tokenInfo });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token', message: error.message });
    }
  }
);

/**
 * GET /api/hytale-downloader/auth/auto-refresh
 * Get auto-refresh settings
 */
router.get(
  '/auth/auto-refresh',
  requirePermission(PERMISSIONS.HYTALE_DL_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const settings = await hytaleDownloaderService.getAutoRefreshSettings();
      res.json(settings);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error getting auto-refresh settings:', error);
      res.status(500).json({ error: 'Failed to get auto-refresh settings', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/auth/auto-refresh
 * Update auto-refresh settings
 */
router.post(
  '/auth/auto-refresh',
  requirePermission(PERMISSIONS.HYTALE_DL_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const { enabled, intervalSeconds } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
      }

      if (intervalSeconds !== undefined && (typeof intervalSeconds !== 'number' || intervalSeconds < 60)) {
        res.status(400).json({ error: 'intervalSeconds must be a number >= 60' });
        return;
      }

      const settings = await hytaleDownloaderService.setAutoRefreshSettings(enabled, intervalSeconds);
      res.json({ success: true, settings });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error updating auto-refresh settings:', error);
      res.status(500).json({ error: 'Failed to update auto-refresh settings', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/download
 * Start a server download
 */
router.post(
  '/download',
  requirePermission(PERMISSIONS.HYTALE_DL_DOWNLOAD),
  async (req: Request, res: Response) => {
    try {
      const { destinationPath, patchline, skipUpdateCheck } = req.body;

      if (!destinationPath) {
        res.status(400).json({ error: 'destinationPath is required' });
        return;
      }

      const session = await hytaleDownloaderService.startDownload({
        destinationPath,
        patchline,
        skipUpdateCheck,
      });

      res.json(session);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error starting download:', error);
      res.status(500).json({ error: 'Failed to start download', message: error.message });
    }
  }
);

/**
 * GET /api/hytale-downloader/download/:sessionId
 * Get the status of a download session
 */
router.get(
  '/download/:sessionId',
  requirePermission(PERMISSIONS.HYTALE_DL_DOWNLOAD),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = hytaleDownloaderService.getDownloadSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error getting download status:', error);
      res.status(500).json({ error: 'Failed to get download status', message: error.message });
    }
  }
);

/**
 * POST /api/hytale-downloader/download/:sessionId/cancel
 * Cancel a download
 */
router.post(
  '/download/:sessionId/cancel',
  requirePermission(PERMISSIONS.HYTALE_DL_DOWNLOAD),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      hytaleDownloaderService.cancelDownload(sessionId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[HytaleDownloader] Error cancelling download:', error);
      res.status(500).json({ error: 'Failed to cancel download', message: error.message });
    }
  }
);

export default router;
