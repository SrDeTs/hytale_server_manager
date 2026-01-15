// Mock logger first - must be before imports
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the ModtaleApiService
jest.mock('../../services/ModtaleApiService', () => ({
  modtaleApiService: {
    setApiKey: jest.fn(),
    searchProjects: jest.fn(),
    getProject: jest.fn(),
    getProjectBySlug: jest.fn(),
    getTags: jest.fn(),
    getClassifications: jest.fn(),
    getVersionDependencies: jest.fn(),
    downloadVersion: jest.fn(),
  },
}));

import express from 'express';
import request from 'supertest';
import { createModtaleRoutes } from '../modtale';
import { modtaleApiService } from '../../services/ModtaleApiService';
import { Readable } from 'stream';

describe('Modtale Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/modtale', createModtaleRoutes());
  });

  describe('POST /api/modtale/set-key', () => {
    it('should set API key successfully', async () => {
      const response = await request(app)
        .post('/api/modtale/set-key')
        .send({ apiKey: 'test-api-key' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(modtaleApiService.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should return 400 when API key is missing', async () => {
      const response = await request(app)
        .post('/api/modtale/set-key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('API key is required');
    });

    it('should return 400 when API key is not a string', async () => {
      const response = await request(app)
        .post('/api/modtale/set-key')
        .send({ apiKey: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('API key is required');
    });
  });

  describe('GET /api/modtale/projects', () => {
    it('should search projects with query parameters', async () => {
      const mockResult = {
        projects: [{ id: 'proj-1', title: 'Test Mod' }],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      (modtaleApiService.searchProjects as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/modtale/projects')
        .query({
          q: 'test',
          classification: 'MODPACK',
          page: '0',
          limit: '20',
          sortBy: 'downloads',
          sortOrder: 'desc',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(modtaleApiService.searchProjects).toHaveBeenCalledWith({
        query: 'test',
        classification: 'MODPACK',
        tags: undefined,
        gameVersion: undefined,
        minRating: undefined,
        maxRating: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        page: 0,
        limit: 20,
        sortBy: 'downloads',
        sortOrder: 'desc',
      });
    });

    it('should handle search errors', async () => {
      (modtaleApiService.searchProjects as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const response = await request(app).get('/api/modtale/projects');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API error');
    });

    it('should parse tags as comma-separated list', async () => {
      (modtaleApiService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
      });

      await request(app)
        .get('/api/modtale/projects')
        .query({ tags: 'adventure,combat,magic' });

      expect(modtaleApiService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['adventure', 'combat', 'magic'],
        })
      );
    });
  });

  describe('GET /api/modtale/projects/:id', () => {
    it('should get project by ID', async () => {
      const mockProject = { id: 'proj-123', title: 'Test Project' };
      (modtaleApiService.getProject as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).get('/api/modtale/projects/proj-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProject);
      expect(modtaleApiService.getProject).toHaveBeenCalledWith('proj-123');
    });

    it('should handle project not found', async () => {
      (modtaleApiService.getProject as jest.Mock).mockRejectedValue(
        new Error('Project not found')
      );

      const response = await request(app).get('/api/modtale/projects/invalid-id');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('GET /api/modtale/projects/slug/:slug', () => {
    it('should get project by slug', async () => {
      const mockProject = { id: 'proj-123', slug: 'test-project' };
      (modtaleApiService.getProjectBySlug as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).get('/api/modtale/projects/slug/test-project');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProject);
      expect(modtaleApiService.getProjectBySlug).toHaveBeenCalledWith('test-project');
    });
  });

  describe('GET /api/modtale/tags', () => {
    it('should return all tags', async () => {
      const mockTags = [
        { id: 'tag1', name: 'Adventure' },
        { id: 'tag2', name: 'Combat' },
      ];
      (modtaleApiService.getTags as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app).get('/api/modtale/tags');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTags);
    });
  });

  describe('GET /api/modtale/classifications', () => {
    it('should return all classifications', async () => {
      const mockClassifications = ['PLUGIN', 'MODPACK', 'DATA'];
      (modtaleApiService.getClassifications as jest.Mock).mockResolvedValue(
        mockClassifications
      );

      const response = await request(app).get('/api/modtale/classifications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockClassifications);
    });
  });

  describe('GET /api/modtale/projects/:id/versions/:versionId/dependencies', () => {
    it('should return dependencies for a version', async () => {
      const mockDependencies = [
        { projectId: 'dep-1', projectName: 'Dependency 1', required: true },
        { projectId: 'dep-2', projectName: 'Dependency 2', required: false },
      ];
      (modtaleApiService.getVersionDependencies as jest.Mock).mockResolvedValue(
        mockDependencies
      );

      const response = await request(app).get(
        '/api/modtale/projects/proj-123/versions/v1.0.0/dependencies'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDependencies);
      expect(modtaleApiService.getVersionDependencies).toHaveBeenCalledWith(
        'proj-123',
        'v1.0.0'
      );
    });

    it('should return empty array when no dependencies', async () => {
      (modtaleApiService.getVersionDependencies as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get(
        '/api/modtale/projects/proj-123/versions/v1.0.0/dependencies'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle errors when fetching dependencies', async () => {
      (modtaleApiService.getVersionDependencies as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch dependencies')
      );

      const response = await request(app).get(
        '/api/modtale/projects/proj-123/versions/v1.0.0/dependencies'
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch dependencies');
    });
  });

  describe('GET /api/modtale/projects/:id/versions/:versionId/download', () => {
    it('should stream download file', async () => {
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('mock file content'));
          this.push(null);
        },
      });

      (modtaleApiService.downloadVersion as jest.Mock).mockResolvedValue(mockStream);

      const response = await request(app).get(
        '/api/modtale/projects/proj-123/versions/v1.0.0/download'
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="proj-123-v1.0.0.zip"'
      );
      expect(modtaleApiService.downloadVersion).toHaveBeenCalledWith(
        'proj-123',
        'v1.0.0'
      );
    });

    it('should handle download errors', async () => {
      (modtaleApiService.downloadVersion as jest.Mock).mockRejectedValue(
        new Error('Download failed')
      );

      const response = await request(app).get(
        '/api/modtale/projects/proj-123/versions/v1.0.0/download'
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Download failed');
    });
  });
});
