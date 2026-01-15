/**
 * Admin Password Reset Script
 *
 * Run this script to reset the admin password to a known value.
 * Usage: node reset-admin.js [new-password]
 *
 * If no password is provided, it will use: Admin123!@#
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const newPassword = process.argv[2] || 'Admin123!@#';

  console.log('Resetting admin password...\n');

  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!admin) {
      console.log('No admin user found. Creating one...');

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.create({
        data: {
          email: 'admin@hytalepanel.local',
          username: 'admin',
          passwordHash,
          role: 'admin',
        },
      });

      console.log('Admin user created!');
    } else {
      console.log(`Found admin user: ${admin.username} (${admin.email})`);

      // Check if account is locked
      if (admin.lockedUntil) {
        console.log(`Account was locked until: ${admin.lockedUntil}`);
      }
      if (admin.failedLoginAttempts) {
        console.log(`Failed login attempts: ${admin.failedLoginAttempts}`);
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      console.log('Password updated and account unlocked!');
    }

    console.log('\n========================================');
    console.log('  Admin Credentials:');
    console.log('  Username: admin');
    console.log(`  Password: ${newPassword}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
