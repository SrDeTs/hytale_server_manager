---
title: Backups
description: Protect your server data with automated and manual backups.
category: features
order: 3
---

## Overview

The backup system provides comprehensive data protection for your servers. Create manual backups on-demand or schedule automatic backups with flexible retention policies.

![Server Management](/hytale_server_manager/images/backups.jpeg)

## Creating Backups

### Manual Backups

1. Navigate to **Backups** in the sidebar
2. Select your server from the dropdown
3. Click **Create Backup**
4. Wait for the backup to complete

### Backup Contents

Each backup includes:

- World data
- Server configuration files
- Installed mods
- Player data

## Automated Backups

### Setting Up Automation

1. Go to **Automation**
2. Click **Create Task**
3. Select **Backup** as the task type
4. Configure the schedule
5. Save the task

### Schedule Options

Use cron expressions or presets:

- Every hour
- Every 6 hours
- Daily at midnight
- Custom cron expression

## Managing Backups

### Viewing Backups

The backup list shows:

- Backup name and date
- File size
- Status (completed, failed)
- Server association

### Filtering Backups

- Filter by server
- Filter by date range
- Search by name

### Backup Statistics

View aggregate statistics:

- Total backup count
- Total storage used
- Average backup size

## Restoring from Backup

### Restore Process

1. Find the backup you want to restore
2. Click the **Restore** button
3. Confirm the restore action
4. Wait for completion

> **Warning**: Restoring a backup will overwrite current server data. Always stop the server before restoring.

### Partial Restoration

For advanced users, you can manually extract specific files from backups located in the `data/backups` directory.

## Best Practices

1. **Regular Backups**: Schedule daily backups at minimum
2. **Test Restores**: Periodically verify backup integrity by restoring to a test server
3. **Offsite Storage**: Consider copying backups to external storage
4. **Retention Policy**: Configure automatic deletion of old backups to manage storage
5. **Pre-Update Backups**: Always backup before server updates or major changes
