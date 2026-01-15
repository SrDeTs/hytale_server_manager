// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ModtaleApiService } from '../ModtaleApiService';
import { Readable } from 'stream';

// Mock global fetch
const mockedFetch = jest.fn();
global.fetch = mockedFetch as any;

describe('ModtaleApiService', () => {
  let service: ModtaleApiService;
  const TEST_API_KEY = 'test-api-key-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ModtaleApiService();
    service.setApiKey(TEST_API_KEY);
  });

  describe('setApiKey / getApiKey', () => {
    it('should set and get API key', () => {
      const newService = new ModtaleApiService();
      expect(newService.getApiKey()).toBeNull();

      newService.setApiKey('my-key');
      expect(newService.getApiKey()).toBe('my-key');
    });
  });

  describe('searchProjects', () => {
    it('should search projects with correct parameters', async () => {
      const mockResponse = {
        content: [
          {
            id: 'proj-1',
            title: 'Test Mod',
            downloadCount: 1000,
            rating: 4.5,
            tags: ['adventure', 'combat'],
            author: 'TestAuthor',
          },
        ],
        totalElements: 1,
        number: 0,
        size: 20,
        last: true,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']]),
      } as any);

      const result = await service.searchProjects({
        query: 'test',
        classification: 'MODPACK',
        page: 0,
        limit: 20,
        sortBy: 'downloads',
        sortOrder: 'desc',
      });

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockedFetch.mock.calls[0];
      expect(url).toContain('/projects');
      expect(url).toContain('search=test');
      expect(url).toContain('classification=MODPACK');
      expect(url).toContain('sort=downloadCount,desc');
      expect((options?.headers as Record<string, string>)['X-MODTALE-KEY']).toBe(TEST_API_KEY);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].title).toBe('Test Mod');
      expect(result.total).toBe(1);
    });

    it('should throw error when API key is not set', async () => {
      const newService = new ModtaleApiService();

      await expect(newService.searchProjects({})).rejects.toThrow(
        'Modtale API key not configured'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid API key' }),
        headers: new Map(),
      } as any);

      await expect(service.searchProjects({})).rejects.toThrow('Invalid API key');
    });

    it('should transform project data correctly', async () => {
      const mockResponse = {
        content: [
          {
            id: 'proj-1',
            title: 'Test Mod',
            downloadCount: 5000,
            imageUrl: 'https://example.com/icon.png',
            author: 'SimpleAuthor',
            averageRating: 4.2,
            favoriteCount: 100,
            description: 'A test mod',
            createdDate: '2024-01-01',
            updatedDate: '2024-06-01',
            tags: ['tag1', { id: 'tag2', name: 'Tag Two' }],
          },
        ],
        totalElements: 1,
        number: 0,
        size: 20,
        last: true,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map(),
      } as any);

      const result = await service.searchProjects({});

      const project = result.projects[0];
      expect(project.downloads).toBe(5000);
      expect(project.iconUrl).toBe('https://example.com/icon.png');
      expect(project.author.username).toBe('SimpleAuthor');
      expect(project.rating).toBe(4.2);
      expect(project.ratingCount).toBe(100);
      expect(project.tags).toHaveLength(2);
      expect(project.tags[0]).toEqual({ id: 'tag1', name: 'tag1', slug: 'tag1' });
      expect(project.tags[1].name).toBe('Tag Two');
    });

    it('should handle array response format', async () => {
      const mockResponse = [
        { id: 'proj-1', title: 'Mod 1' },
        { id: 'proj-2', title: 'Mod 2' },
      ];

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map(),
      } as any);

      const result = await service.searchProjects({ page: 1, limit: 10 });

      expect(result.projects).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should map sort fields correctly', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [], totalElements: 0, last: true }),
        headers: new Map(),
      } as any);

      await service.searchProjects({ sortBy: 'updated' });

      const [url] = mockedFetch.mock.calls[0];
      expect(url).toContain('sort=updatedDate');
    });
  });

  describe('getProject', () => {
    it('should fetch project by ID', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Test Project',
        downloadCount: 1000,
        author: 'Author',
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getProject('proj-123');

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      const [url] = mockedFetch.mock.calls[0];
      expect(url).toContain('/projects/proj-123');
      expect(result.id).toBe('proj-123');
      expect(result.title).toBe('Test Project');
    });
  });

  describe('getProjectBySlug', () => {
    it('should fetch project by slug', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Test Project',
        slug: 'test-project',
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getProjectBySlug('test-project');

      const [url] = mockedFetch.mock.calls[0];
      expect(url).toContain('/projects/slug/test-project');
      expect(result.slug).toBe('test-project');
    });
  });

  describe('getTags', () => {
    it('should fetch all tags', async () => {
      const mockTags = [
        { id: 'tag1', name: 'Adventure' },
        { id: 'tag2', name: 'Combat' },
      ];

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
        headers: new Map(),
      } as any);

      const result = await service.getTags();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Adventure');
    });
  });

  describe('getClassifications', () => {
    it('should fetch classifications', async () => {
      const mockClassifications = ['PLUGIN', 'MODPACK', 'DATA', 'ART'];

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassifications,
        headers: new Map(),
      } as any);

      const result = await service.getClassifications();

      expect(result).toContain('PLUGIN');
      expect(result).toContain('MODPACK');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return correct download URL', () => {
      const url = service.getDownloadUrl('proj-123', 'v1.0.0');

      expect(url).toBe(
        'https://api.modtale.net/api/v1/projects/proj-123/versions/v1.0.0/download'
      );
    });
  });

  describe('getVersionDependencies', () => {
    it('should extract dependencies from version modIds', async () => {
      const mockProject = {
        id: 'proj-123',
        versions: [
          {
            id: 'v1.0.0',
            version: '1.0.0',
            modIds: ['dep-1', 'dep-2'],
          },
          {
            id: 'v0.9.0',
            version: '0.9.0',
            modIds: ['dep-1'],
          },
        ],
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('proj-123', 'v1.0.0');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        projectId: 'dep-1',
        projectName: 'dep-1',
        versionId: null,
        required: true,
      });
      expect(result[1].projectId).toBe('dep-2');
    });

    it('should handle object dependencies with full details', async () => {
      const mockProject = {
        id: 'proj-123',
        versions: [
          {
            id: 'v1.0.0',
            modIds: [
              {
                modId: 'dep-1',
                name: 'Dependency One',
                versionId: 'v2.0.0',
                required: true,
              },
              {
                modId: 'dep-2',
                name: 'Dependency Two',
                required: false,
              },
            ],
          },
        ],
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('proj-123', 'v1.0.0');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        projectId: 'dep-1',
        projectName: 'Dependency One',
        versionId: 'v2.0.0',
        required: true,
      });
      expect(result[1]).toEqual({
        projectId: 'dep-2',
        projectName: 'Dependency Two',
        versionId: null,
        required: false,
      });
    });

    it('should return empty array when version not found', async () => {
      const mockProject = {
        id: 'proj-123',
        versions: [
          { id: 'v1.0.0', modIds: ['dep-1'] },
        ],
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('proj-123', 'v999.0.0');

      expect(result).toEqual([]);
    });

    it('should return empty array when no modIds', async () => {
      const mockProject = {
        id: 'proj-123',
        versions: [
          { id: 'v1.0.0' }, // No modIds
        ],
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('proj-123', 'v1.0.0');

      expect(result).toEqual([]);
    });

    it('should handle API errors and return empty array', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Project not found',
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('invalid-proj', 'v1.0.0');

      expect(result).toEqual([]);
    });

    it('should use dependencies field as fallback', async () => {
      const mockProject = {
        id: 'proj-123',
        versions: [
          {
            id: 'v1.0.0',
            dependencies: ['dep-1', 'dep-2'], // Using dependencies instead of modIds
          },
        ],
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
        headers: new Map(),
      } as any);

      const result = await service.getVersionDependencies('proj-123', 'v1.0.0');

      expect(result).toHaveLength(2);
    });
  });

  describe('downloadVersion', () => {
    it('should return readable stream for download', async () => {
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('mock file content'));
          this.push(null);
        },
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
        headers: new Map(),
      } as any);

      const result = await service.downloadVersion('proj-123', 'v1.0.0');

      expect(result).toBe(mockStream);
      const [url, options] = mockedFetch.mock.calls[0];
      expect(url).toBe(
        'https://api.modtale.net/api/v1/projects/proj-123/versions/v1.0.0/download'
      );
      expect((options?.headers as Record<string, string>)['X-MODTALE-KEY']).toBe(TEST_API_KEY);
    });

    it('should throw error when API key not configured', async () => {
      const newService = new ModtaleApiService();

      await expect(newService.downloadVersion('proj-123', 'v1.0.0')).rejects.toThrow(
        'Modtale API key not configured'
      );
    });

    it('should throw error on download failure', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Version not found',
        headers: new Map(),
      } as any);

      await expect(service.downloadVersion('proj-123', 'v1.0.0')).rejects.toThrow(
        'Download failed: HTTP 404'
      );
    });

    it('should throw error when response body is null', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
        headers: new Map(),
      } as any);

      await expect(service.downloadVersion('proj-123', 'v1.0.0')).rejects.toThrow(
        'No response body received'
      );
    });
  });
});
