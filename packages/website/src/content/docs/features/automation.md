---
title: Automation
description: Automate server tasks with flexible scheduling.
category: features
order: 4
---

## Overview

The automation system allows you to schedule recurring tasks using cron expressions. Automate backups, restarts, commands, and more.

![Server Management](/hytale_server_manager/images/automation.jpeg)

## Task Types

### Backup

Automatically create server backups on a schedule.

- Configure backup retention
- Set compression options
- Exclude specific files

### Restart

Schedule server restarts for maintenance.

- Graceful shutdown
- Player warning messages
- Automatic startup

### Start/Stop

Schedule server start and stop times.

- Energy saving during off-hours
- Scheduled maintenance windows

### Command

Execute custom server commands.

- Broadcast messages
- Run maintenance scripts
- Trigger in-game events

## Creating Tasks

### Step-by-Step

1. Navigate to **Automation**
2. Click **Create Task**
3. Select the task type
4. Choose the target server
5. Configure the schedule
6. Save the task

### Schedule Presets

Quick scheduling options:

- **Every 15 minutes**
- **Every 30 minutes**
- **Hourly**
- **Every 6 hours**
- **Daily at midnight**
- **Daily at noon**
- **Weekly**

### Custom Cron Expressions

For advanced scheduling, use cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

**Examples:**

- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 4 * * 0` - Weekly on Sunday at 4 AM
- `*/30 * * * *` - Every 30 minutes

## Managing Tasks

### Task Controls

- **Enable/Disable**: Toggle task execution
- **Run Now**: Execute immediately
- **Edit**: Modify task settings
- **Delete**: Remove the task

### Execution History

View task execution history:

- Last run time
- Success/failure status
- Error messages
- Run count

## Best Practices

1. **Stagger Tasks**: Don't schedule multiple heavy tasks at the same time
2. **Test First**: Run tasks manually before enabling automation
3. **Monitor Results**: Check execution history regularly
4. **Backup Before Restart**: Schedule backups before automated restarts
5. **Off-Peak Hours**: Schedule intensive tasks during low-traffic periods
