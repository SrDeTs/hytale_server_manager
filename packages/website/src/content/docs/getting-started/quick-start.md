---
title: Quick Start
description: Get up and running with your first Hytale server in minutes.
category: getting-started
order: 2
---

## Creating Your First Server

Once you've installed Hytale Server Manager and logged in, follow these steps to create your first server.

### Step 1: Navigate to Servers

Click on **Servers** in the sidebar navigation to access the server management page.

### Step 2: Create New Server

Click the **Create Server** button in the top right corner. You'll see a form with the following options:

- **Server Name**: A friendly name for your server
- **Server Directory**: Directory where your server files will be (Can be relative, or absolute paths)
- **Address**: Listening address for the server
- **Port**: The port your server will run on (default: 5520)
- **Version**: Game Version
- **Max Players**: Maximum number of concurrent players
- **Game Mode**: The default game mode for players
- **Adapter Type**: Type of process adapter. For now, only a Java JAR is supported
- **Java Configuration**: Set java settings relevant to your setup

Click the **Create Server** Button in the bottom right or the creation popup

### Step 3: Configure Server Settings

After creating the server, you can configure additional settings by going into the Server Details -> Settings:

- General
    - Server Name
    - Max Players
    - Message of the day (If possible in hytale, idk yet)
    - Difficulty
    - Game Mode
    - Quick settings
- Storage
    - Server Directory
    - Backup Storage Type
        - Local Directory (On the same hardware server)
        - FTP (Remote, supports SFTP as well)
        - Backup path
        - Backup Exclusions
- Network settings
    - Server IP
    - Server Port
- Advanced
    - JVM Arguments

### Step 4: Start Your Server

Click the **Start** button on your server card. The server will begin starting up, and you can monitor the progress in the console.

## Using the Dashboard

The dashboard provides an overview of your host hardware and some important information about your servers:

- **Total Servers**: Number of servers created and how many are running
- **Resource Usage**: CPU and Memory usage on the host itself
- **CPU & Memory Usage Chart**: Historical data of the resource usage
- **Recent Activity**: Recent activity log quick view
- **Alerts**: Quick view for alerts

## What's Next?

Now that you have a server running:

- [Install Mods](/hytale_server_manager/docs/features/mod-marketplace) - Add content from Modtale
- [Set Up Backups](/hytale_server_manager/docs/features/backups) - Protect your server data
- [Configure Automation](/hytale_server_manager/docs/features/automation) - Schedule tasks
