import { DiscordNotificationService, DiscordConfig } from '../DiscordNotificationService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DiscordNotificationService', () => {
  let service: DiscordNotificationService;
  const mockConfig: DiscordConfig = {
    enabled: true,
    webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijk',
    username: 'Test Bot',
    enabledEvents: ['server_start', 'player_ban', 'backup_failed'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DiscordNotificationService(mockConfig);
  });

  describe('notify', () => {
    it('should send notification when enabled and event is in enabled list', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      await service.notify('server_start', {
        serverName: 'Test Server',
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          username: mockConfig.username,
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Server Started'),
            }),
          ]),
        })
      );
    });

    it('should not send notification when disabled', async () => {
      const disabledService = new DiscordNotificationService({
        ...mockConfig,
        enabled: false,
      });

      await disabledService.notify('server_start', {
        serverName: 'Test Server',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should not send notification when event is not in enabled list', async () => {
      await service.notify('player_join', {
        serverName: 'Test Server',
        playerName: 'TestPlayer',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle webhook errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        service.notify('server_start', {
          serverName: 'Test Server',
        })
      ).resolves.not.toThrow();

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should send critical player ban notification with correct embed', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      await service.notify('player_ban', {
        serverName: 'Test Server',
        playerName: 'BadPlayer',
        reason: 'Cheating',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: '🔨 Player Banned',
              color: 0xff0000, // Red for critical
              description: expect.stringContaining('BadPlayer'),
            }),
          ]),
        })
      );
    });

    it('should include role mention for critical alerts', async () => {
      const serviceWithRole = new DiscordNotificationService({
        ...mockConfig,
        mentionRoleId: '987654321',
      });
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      await serviceWithRole.notify('backup_failed', {
        serverName: 'Test Server',
        reason: 'Disk full',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          content: '<@&987654321>',
        })
      );
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled and webhook URL is provided', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledService = new DiscordNotificationService({
        ...mockConfig,
        enabled: false,
      });
      expect(disabledService.isEnabled()).toBe(false);
    });

    it('should return false when webhook URL is missing', () => {
      const noWebhookService = new DiscordNotificationService({
        ...mockConfig,
        webhookUrl: undefined,
      });
      expect(noWebhookService.isEnabled()).toBe(false);
    });
  });

  describe('isEventEnabled', () => {
    it('should return true for enabled event', () => {
      expect(service.isEventEnabled('server_start')).toBe(true);
    });

    it('should return false for disabled event', () => {
      expect(service.isEventEnabled('player_join')).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({
        username: 'New Bot Name',
      });

      const config = service.getConfig();
      expect(config.username).toBe('New Bot Name');
    });

    it('should merge with existing configuration', () => {
      service.updateConfig({
        avatarUrl: 'https://example.com/avatar.png',
      });

      const config = service.getConfig();
      expect(config.username).toBe(mockConfig.username);
      expect(config.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  describe('testNotification', () => {
    it('should send test notification successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      const result = await service.testNotification();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: '✅ Discord Integration Test',
            }),
          ]),
        })
      );
    });

    it('should return false when test notification fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.testNotification();

      expect(result).toBe(false);
    });
  });

  describe('embed creation', () => {
    it('should create correct embed for server events', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      const events = ['server_start', 'server_stop', 'server_restart'];

      for (const event of events) {
        await service.notify(event as any, {
          serverName: 'Test Server',
        });
      }

      expect(mockedAxios.post).toHaveBeenCalledTimes(events.length);
    });

    it('should create correct embed for performance alerts', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'success' });

      const performanceConfig: DiscordConfig = {
        ...mockConfig,
        enabledEvents: ['high_cpu', 'high_memory', 'high_disk'],
      };
      const perfService = new DiscordNotificationService(performanceConfig);

      await perfService.notify('high_cpu', {
        serverName: 'Test Server',
        details: { cpuUsage: 95.5 },
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('High CPU Usage'),
              color: 0xff0000, // Red for critical
            }),
          ]),
        })
      );
    });
  });
});
