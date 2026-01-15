---
title: Server Management
description: Learn how to create, configure, and manage your Hytale servers.
category: features
order: 1
---

## Overview

The Server Management feature provides comprehensive tools for creating, configuring, and controlling your Hytale game servers.

![Server Management](/hytale_server_manager/images/servers.jpeg)

## Creating Servers

### Basic Server Creation

1. Navigate to **Servers** in the sidebar
2. Click **Create Server**
3. Fill in the required fields:
   - Server name
   - Port number
   - Max players
4. Click **Create**

### Server Networks

Group related servers into networks for easier management:

1. Click **Create Network**
2. Name your network -> Click **Next**
3. Select servers to add to the network

## Server Controls

### Basic Actions

- **Start**: Begin server process
- **Stop**: Gracefully stop the server
- **Restart**: Stop and start in sequence
- **Details**: Open server details

### Console Access

Access the live console to:

- View real-time server output
- Execute commands
- Download log history
- Filter by log level

## Server Settings

### General Settings

- Server Name
- Max Players
- Message of the day (If possible in hytale, idk yet)
- Difficulty
- Game Mode
- Quick settings

### Storage

- Server Directory
- Backup Storage Type
   - Local Directory (On the same hardware server)
   - FTP (Remote, supports SFTP as well)
   - Backup path
   - Backup Exclusions

### Network Settings

- Server IP
- Server Port

### Advanced Settings

- JVM Arguments

## Monitoring

### Real-time Metrics

The dashboard displays live metrics:

- **CPU Usage**: Current processor utilization
- **Memory Usage**: RAM consumption
- **TPS**: Server ticks per second
- **Player Count**: Current online players

### Health Indicators

Color-coded status indicators:

- 🟢 **Green**: Healthy
- 🟡 **Yellow**: Warning (high resource usage)
- 🔴 **Red**: Critical or offline

## Best Practices

1. **Regular Backups**: Enable automated backups before making changes
2. **Resource Monitoring**: Set up alerts for high CPU/memory usage
3. **Graceful Shutdowns**: Always use Stop instead of Kill when possible
4. **Network Organization**: Group related servers for easier management
