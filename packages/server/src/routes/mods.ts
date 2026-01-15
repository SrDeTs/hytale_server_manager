import { Router, Request, Response, NextFunction } from 'express';
import { ModProviderService } from '../services/ModProviderService';
import { UnifiedSearchParams, UnifiedClassification } from '../providers/mod';
import { authenticate } from '../middleware/auth';

/**
 * Create the mods router.
 *
 * Provides unified API for mod providers:
 * - GET  /api/mods/providers                                      - List providers
 * - POST /api/mods/providers/:providerId/configure                - Configure API key
 * - GET  /api/mods/providers/:providerId/search                   - Search provider
 * - GET  /api/mods/providers/:providerId/projects/:projectId      - Get project
 * - GET  /api/mods/providers/:providerId/categories               - Get categories
 * - GET  /api/mods/providers/:providerId/tags                     - Get tags
 * - GET  /api/mods/providers/:providerId/projects/:projectId/versions/:versionId/dependencies
 * - GET  /api/mods/providers/:providerId/projects/:projectId/versions/:versionId/download
 * - GET  /api/mods/search                                         - Search all providers
 */
export function createModsRouter(modProviderService: ModProviderService): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  /**
   * GET /providers
   * List all available mod providers with their status.
   */
  router.get('/providers', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = modProviderService.getProviders();
      res.json(providers);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /providers/:providerId/configure
   * Configure API key for a provider.
   */
  router.post(
    '/providers/:providerId/configure',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId } = req.params;
        const { apiKey } = req.body;

        if (!apiKey || typeof apiKey !== 'string') {
          res.status(400).json({ error: 'API key is required' });
          return;
        }

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const userId = (req as any).user?.id;
        await modProviderService.setProviderApiKey(providerId, apiKey, userId);

        res.json({ success: true, message: `API key configured for ${providerId}` });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/search
   * Search for mods in a specific provider.
   */
  router.get(
    '/providers/:providerId/search',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const params = parseSearchParams(req.query);
        const results = await modProviderService.search(providerId, params);

        res.json(results);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/projects/:projectId
   * Get a specific project from a provider.
   */
  router.get(
    '/providers/:providerId/projects/:projectId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId, projectId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const project = await modProviderService.getProject(providerId, projectId);
        res.json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/projects/slug/:slug
   * Get a project by slug from a provider.
   */
  router.get(
    '/providers/:providerId/projects/slug/:slug',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId, slug } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const project = await modProviderService.getProjectBySlug(providerId, slug);
        res.json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/categories
   * Get categories for a provider.
   */
  router.get(
    '/providers/:providerId/categories',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const categories = await modProviderService.getCategories(providerId);
        res.json(categories);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/tags
   * Get tags for a provider.
   */
  router.get(
    '/providers/:providerId/tags',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const tags = await modProviderService.getTags(providerId);
        res.json(tags);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/projects/:projectId/versions/:versionId/dependencies
   * Get dependencies for a specific version.
   */
  router.get(
    '/providers/:providerId/projects/:projectId/versions/:versionId/dependencies',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId, projectId, versionId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const dependencies = await modProviderService.getVersionDependencies(
          providerId,
          projectId,
          versionId
        );
        res.json(dependencies);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /providers/:providerId/projects/:projectId/versions/:versionId/download
   * Download a mod file from a provider (proxied).
   */
  router.get(
    '/providers/:providerId/projects/:projectId/versions/:versionId/download',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { providerId, projectId, versionId } = req.params;

        if (!modProviderService.hasProvider(providerId)) {
          res.status(404).json({ error: `Provider not found: ${providerId}` });
          return;
        }

        const stream = await modProviderService.downloadVersion(providerId, projectId, versionId);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${projectId}-${versionId}.zip"`
        );

        stream.pipe(res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /search
   * Search across all configured providers.
   */
  router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseSearchParams(req.query);
      const results = await modProviderService.searchAll(params);
      res.json(results);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Parse search query parameters into UnifiedSearchParams.
 */
function parseSearchParams(query: Record<string, any>): UnifiedSearchParams {
  const params: UnifiedSearchParams = {};

  if (query.q || query.query) {
    params.query = String(query.q || query.query);
  }

  if (query.classification) {
    params.classification = query.classification as UnifiedClassification;
  }

  if (query.categories) {
    params.categories = Array.isArray(query.categories)
      ? query.categories
      : String(query.categories).split(',');
  }

  if (query.tags) {
    params.tags = Array.isArray(query.tags)
      ? query.tags
      : String(query.tags).split(',');
  }

  if (query.gameVersion) {
    params.gameVersion = String(query.gameVersion);
  }

  if (query.page !== undefined) {
    params.page = parseInt(String(query.page), 10) || 1;
  }

  if (query.pageSize || query.limit) {
    params.pageSize = parseInt(String(query.pageSize || query.limit), 10) || 50;
  }

  if (query.sortBy) {
    params.sortBy = query.sortBy as UnifiedSearchParams['sortBy'];
  }

  if (query.sortOrder) {
    params.sortOrder = query.sortOrder as 'asc' | 'desc';
  }

  return params;
}

export default createModsRouter;
