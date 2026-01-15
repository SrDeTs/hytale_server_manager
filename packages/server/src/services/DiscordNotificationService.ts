import axios from 'axios';
import logger from '../utils/logger';

export type NotificationEvent =
  | 'server_start'
  | 'server_stop'
  | 'server_restart'
  | 'server_crash'
  | 'player_join'
  | 'player_leave'
  | 'player_ban'
  | 'player_unban'
  | 'player_kick'
  | 'backup_complete'
  | 'backup_failed'
  | 'alert_critical'
  | 'alert_warning'
  | 'high_cpu'
  | 'high_memory'
  | 'high_disk';

export interface DiscordConfig {
  enabled: boolean;
  webhookUrl?: string;
  username?: string;
  avatarUrl?: string;
  enabledEvents: NotificationEvent[];
  mentionRoleId?: string;
}

export interface NotificationData {
  serverName?: string;
  playerName?: string;
  reason?: string;
  details?: any;
}

export class DiscordNotificationService {
  private config: DiscordConfig;

  constructor(config?: DiscordConfig) {
    this.config = config || {
      enabled: false,
      username: 'Hytale Server Manager',
      enabledEvents: [],
    };
  }

  /**
   * Update Discord configuration
   */
  updateConfig(config: Partial<DiscordConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DiscordConfig {
    return { ...this.config };
  }

  /**
   * Check if Discord notifications are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.webhookUrl;
  }

  /**
   * Check if a specific event is enabled
   */
  isEventEnabled(event: NotificationEvent): boolean {
    return this.config.enabledEvents.includes(event);
  }

  /**
   * Send a Discord notification
   */
  async notify(event: NotificationEvent, data: NotificationData): Promise<void> {
    if (!this.isEnabled() || !this.isEventEnabled(event)) {
      return;
    }

    try {
      const embed = this.createEmbed(event, data);
      await this.sendWebhook(embed);
    } catch (error: any) {
      logger.error(`Failed to send Discord notification for ${event}:`, error.message);
    }
  }

  /**
   * Create Discord embed based on event type
   */
  private createEmbed(event: NotificationEvent, data: NotificationData): any {
    const timestamp = new Date().toISOString();
    let embed: any = {
      timestamp,
      footer: {
        text: 'Hytale Server Manager',
      },
    };

    switch (event) {
      case 'server_start':
        embed = {
          ...embed,
          title: '🟢 Server Started',
          description: `Server **${data.serverName}** has been started successfully.`,
          color: 0x00ff00, // Green
        };
        break;

      case 'server_stop':
        embed = {
          ...embed,
          title: '🔴 Server Stopped',
          description: `Server **${data.serverName}** has been stopped.`,
          color: 0xff0000, // Red
        };
        break;

      case 'server_restart':
        embed = {
          ...embed,
          title: '🔄 Server Restarting',
          description: `Server **${data.serverName}** is being restarted.`,
          color: 0xffa500, // Orange
        };
        break;

      case 'server_crash':
        embed = {
          ...embed,
          title: '💥 Server Crashed',
          description: `Server **${data.serverName}** has crashed!`,
          color: 0xff0000, // Red
          fields: data.details ? [
            {
              name: 'Error Details',
              value: `\`\`\`${data.details.substring(0, 1000)}\`\`\``,
            },
          ] : [],
        };
        break;

      case 'player_join':
        embed = {
          ...embed,
          title: '👋 Player Joined',
          description: `**${data.playerName}** joined **${data.serverName}**`,
          color: 0x00ff00, // Green
        };
        break;

      case 'player_leave':
        embed = {
          ...embed,
          title: '👋 Player Left',
          description: `**${data.playerName}** left **${data.serverName}**`,
          color: 0x808080, // Gray
        };
        break;

      case 'player_ban':
        embed = {
          ...embed,
          title: '🔨 Player Banned',
          description: `**${data.playerName}** was banned from **${data.serverName}**`,
          color: 0xff0000, // Red
          fields: data.reason ? [
            {
              name: 'Reason',
              value: data.reason,
            },
          ] : [],
        };
        break;

      case 'player_unban':
        embed = {
          ...embed,
          title: '✅ Player Unbanned',
          description: `**${data.playerName}** was unbanned from **${data.serverName}**`,
          color: 0x00ff00, // Green
        };
        break;

      case 'player_kick':
        embed = {
          ...embed,
          title: '👢 Player Kicked',
          description: `**${data.playerName}** was kicked from **${data.serverName}**`,
          color: 0xffa500, // Orange
          fields: data.reason ? [
            {
              name: 'Reason',
              value: data.reason,
            },
          ] : [],
        };
        break;

      case 'backup_complete':
        embed = {
          ...embed,
          title: '💾 Backup Complete',
          description: `Backup of **${data.serverName}** completed successfully.`,
          color: 0x00ff00, // Green
          fields: data.details ? [
            {
              name: 'Backup Info',
              value: data.details,
            },
          ] : [],
        };
        break;

      case 'backup_failed':
        embed = {
          ...embed,
          title: '❌ Backup Failed',
          description: `Backup of **${data.serverName}** failed!`,
          color: 0xff0000, // Red
          fields: data.details ? [
            {
              name: 'Error',
              value: data.details,
            },
          ] : [],
        };
        break;

      case 'alert_critical':
        embed = {
          ...embed,
          title: '🚨 Critical Alert',
          description: `**${data.serverName}**: ${data.details}`,
          color: 0xff0000, // Red
        };
        break;

      case 'alert_warning':
        embed = {
          ...embed,
          title: '⚠️ Warning Alert',
          description: `**${data.serverName}**: ${data.details}`,
          color: 0xffa500, // Orange
        };
        break;

      case 'high_cpu':
        embed = {
          ...embed,
          title: '📊 High CPU Usage',
          description: `**${data.serverName}** is experiencing high CPU usage.`,
          color: 0xffa500, // Orange
          fields: data.details ? [
            {
              name: 'CPU Usage',
              value: `${data.details}%`,
              inline: true,
            },
          ] : [],
        };
        break;

      case 'high_memory':
        embed = {
          ...embed,
          title: '📊 High Memory Usage',
          description: `**${data.serverName}** is experiencing high memory usage.`,
          color: 0xffa500, // Orange
          fields: data.details ? [
            {
              name: 'Memory Usage',
              value: `${data.details}%`,
              inline: true,
            },
          ] : [],
        };
        break;

      case 'high_disk':
        embed = {
          ...embed,
          title: '💽 High Disk Usage',
          description: `**${data.serverName}** is experiencing high disk usage.`,
          color: 0xffa500, // Orange
          fields: data.details ? [
            {
              name: 'Disk Usage',
              value: `${data.details}%`,
              inline: true,
            },
          ] : [],
        };
        break;

      default:
        embed = {
          ...embed,
          title: '📢 Server Event',
          description: `Event: ${event} on **${data.serverName}**`,
          color: 0x0099ff, // Blue
        };
    }

    return embed;
  }

  /**
   * Send webhook to Discord
   */
  private async sendWebhook(embed: any): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const payload: any = {
      username: this.config.username || 'Hytale Server Manager',
      embeds: [embed],
    };

    if (this.config.avatarUrl) {
      payload.avatar_url = this.config.avatarUrl;
    }

    // Add role mention for critical alerts
    if (embed.color === 0xff0000 && this.config.mentionRoleId) {
      payload.content = `<@&${this.config.mentionRoleId}>`;
    }

    await axios.post(this.config.webhookUrl, payload);
    logger.debug('Discord notification sent successfully');
  }

  /**
   * Test Discord webhook
   */
  async testNotification(): Promise<boolean> {
    if (!this.config.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    try {
      const embed = {
        title: '✅ Discord Integration Test',
        description: 'If you see this message, Discord notifications are working correctly!',
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Hytale Server Manager',
        },
      };

      await this.sendWebhook(embed);
      return true;
    } catch (error: any) {
      logger.error('Discord test notification failed:', error.message);
      return false;
    }
  }
}
