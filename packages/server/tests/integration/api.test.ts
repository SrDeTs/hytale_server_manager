import request from 'supertest';
import { Express } from 'express';
import { App } from '../../src/app';
import { PrismaClient } from '@prisma/client';

describe('API Integration Tests', () => {
  let app: Express;
  let appInstance: App;
  let prisma: PrismaClient;

  beforeAll(async () => {
    appInstance = new App();
    app = appInstance.express;
    prisma = new PrismaClient();

    // Clear test database
    await prisma.server.deleteMany();
    await prisma.player.deleteMany();
    await prisma.backup.deleteMany();
  });

  afterAll(async () => {
    await appInstance.shutdown();
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('GET /health should return 200', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Server Management', () => {
    let serverId: string;

    describe('POST /api/servers', () => {
      it('should create a new server', async () => {
        const serverData = {
          name: 'Integration Test Server',
          address: 'localhost',
          port: 25565,
          version: '1.0.0',
          maxPlayers: 20,
          gameMode: 'survival',
        };

        const response = await request(app)
          .post('/api/servers')
          .send(serverData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(serverData.name);
        expect(response.body.port).toBe(serverData.port);
        expect(response.body.status).toBe('stopped');

        serverId = response.body.id;
      });

      it('should return 400 for invalid server data', async () => {
        const invalidData = {
          name: '',
          address: 'localhost',
          port: 99999, // Invalid port
          version: '1.0.0',
          maxPlayers: 20,
          gameMode: 'survival',
        };

        const response = await request(app)
          .post('/api/servers')
          .send(invalidData);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/servers', () => {
      it('should return list of servers', async () => {
        const response = await request(app).get('/api/servers');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/servers/:id', () => {
      it('should return server by ID', async () => {
        const response = await request(app).get(`/api/servers/${serverId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', serverId);
        expect(response.body).toHaveProperty('name');
      });

      it('should return 404 for non-existent server', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app).get(`/api/servers/${fakeId}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PATCH /api/servers/:id', () => {
      it('should update server', async () => {
        const updates = {
          name: 'Updated Test Server',
          maxPlayers: 30,
        };

        const response = await request(app)
          .patch(`/api/servers/${serverId}`)
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.maxPlayers).toBe(updates.maxPlayers);
      });
    });

    describe('POST /api/servers/:id/start', () => {
      it('should start server', async () => {
        const response = await request(app)
          .post(`/api/servers/${serverId}/start`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/servers/:id/stop', () => {
      it('should stop server', async () => {
        const response = await request(app)
          .post(`/api/servers/${serverId}/stop`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('DELETE /api/servers/:id', () => {
      it('should delete server', async () => {
        const response = await request(app)
          .delete(`/api/servers/${serverId}`);

        expect(response.status).toBe(204);

        // Verify deletion
        const getResponse = await request(app).get(`/api/servers/${serverId}`);
        expect(getResponse.status).toBe(404);
      });
    });
  });

  describe('Settings Management', () => {
    describe('GET /api/settings/discord', () => {
      it('should return Discord settings', async () => {
        const response = await request(app).get('/api/settings/discord');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('enabled');
        expect(response.body).toHaveProperty('enabledEvents');
      });
    });

    describe('PUT /api/settings/discord', () => {
      it('should update Discord settings', async () => {
        const updates = {
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijk',
          username: 'Test Bot',
          enabledEvents: ['server_crash', 'player_ban'],
        };

        const response = await request(app)
          .put('/api/settings/discord')
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });

      it('should return 400 for invalid webhook URL', async () => {
        const invalidUpdates = {
          webhookUrl: 'https://invalid-url.com',
        };

        const response = await request(app)
          .put('/api/settings/discord')
          .send(invalidUpdates);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make requests beyond the rate limit
      for (let i = 0; i < 105; i++) {
        requests.push(request(app).get('/api/servers'));
      }

      const responses = await Promise.all(requests);

      // At least one request should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    }, 30000); // Increase timeout for this test
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/servers')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });
});
