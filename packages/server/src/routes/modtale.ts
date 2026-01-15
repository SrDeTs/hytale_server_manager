import { Router, Request, Response } from 'express';
import { modtaleApiService } from '../services/ModtaleApiService';
import logger from '../utils/logger';

export function createModtaleRoutes(): Router {
  const router = Router();

  /**
   * POST /api/modtale/set-key
   * Set the Modtale API key for this session
   */
  router.post('/set-key', async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
      }

      modtaleApiService.setApiKey(apiKey);
      logger.info('Modtale API key configured successfully');
      logger.info(`API key length: ${apiKey.length} characters`);

      return res.json({ success: true, message: 'API key configured successfully' });
    } catch (error: any) {
      logger.error('Error setting Modtale API key:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/projects
   * Search for projects (mods/modpacks)
   */
  router.get('/projects', async (req: Request, res: Response) => {
    try {
      const params = {
        query: req.query.q as string,
        classification: req.query.classification as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        gameVersion: req.query.gameVersion as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as string,
      };

      const response = await modtaleApiService.searchProjects(params);
      return res.json(response);
    } catch (error: any) {
      logger.error('Error searching projects:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/projects/:id
   * Get project by ID
   */
  router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const project = await modtaleApiService.getProject(id);
      return res.json(project);
    } catch (error: any) {
      logger.error('Error getting project:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/projects/slug/:slug
   * Get project by slug
   */
  router.get('/projects/slug/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const project = await modtaleApiService.getProjectBySlug(slug);
      return res.json(project);
    } catch (error: any) {
      logger.error('Error getting project by slug:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/tags
   * Get all tags
   */
  router.get('/tags', async (_req: Request, res: Response) => {
    try {
      const tags = await modtaleApiService.getTags();
      return res.json(tags);
    } catch (error: any) {
      logger.error('Error getting tags:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/classifications
   * Get all classifications
   */
  router.get('/classifications', async (_req: Request, res: Response) => {
    try {
      const classifications = await modtaleApiService.getClassifications();
      return res.json(classifications);
    } catch (error: any) {
      logger.error('Error getting classifications:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/projects/:id/versions/:versionId/dependencies
   * Get dependencies for a specific version
   */
  router.get('/projects/:id/versions/:versionId/dependencies', async (req: Request, res: Response) => {
    try {
      const { id, versionId } = req.params;
      const dependencies = await modtaleApiService.getVersionDependencies(id, versionId);
      return res.json(dependencies);
    } catch (error: any) {
      logger.error('Error getting version dependencies:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modtale/projects/:id/versions/:versionId/download
   * Proxy download request to Modtale API
   */
  router.get('/projects/:id/versions/:versionId/download', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, versionId } = req.params;
      const downloadStream = await modtaleApiService.downloadVersion(id, versionId);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${id}-${versionId}.zip"`);
      downloadStream.pipe(res);
    } catch (error: any) {
      logger.error('Error downloading version:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
