/**
 * Certificate generation and management utilities
 *
 * Generates self-signed SSL certificates for HTTPS support.
 * Certificates are stored in the data/certs directory.
 */

import fs from 'fs-extra';
import path from 'path';
import { webcrypto } from 'crypto';
import * as x509 from '@peculiar/x509';
import selfsigned from 'selfsigned';
import logger from './logger';

// Set up crypto provider for @peculiar/x509 (required on some Linux systems)
// This must be done before using selfsigned
// eslint-disable-next-line @typescript-eslint/no-explicit-any
x509.cryptoProvider.set(webcrypto as any);

export interface CertificateInfo {
  certPath: string;
  keyPath: string;
  cert: string;
  key: string;
  generated: boolean;
}

export interface CertificateOptions {
  /** Directory to store certificates */
  certsDir: string;
  /** Common name for the certificate (default: localhost) */
  commonName?: string;
  /** Alternative names (IPs and domains) */
  altNames?: string[];
  /** Validity in days (default: 365) */
  validityDays?: number;
}

const DEFAULT_CERT_FILENAME = 'server.crt';
const DEFAULT_KEY_FILENAME = 'server.key';

/**
 * Get local IP addresses for certificate alt names
 */
function getLocalIPs(): string[] {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}

/**
 * Generate a self-signed certificate
 */
export async function generateCertificate(options: CertificateOptions): Promise<CertificateInfo> {
  const {
    certsDir,
    commonName = 'Hytale Server Manager',
    altNames = [],
    validityDays = 365,
  } = options;

  // Ensure certs directory exists
  fs.ensureDirSync(certsDir);

  const certPath = path.join(certsDir, DEFAULT_CERT_FILENAME);
  const keyPath = path.join(certsDir, DEFAULT_KEY_FILENAME);

  // Build alt names including localhost and local IPs
  const localIPs = getLocalIPs();
  const allAltNames: Array<{ type: 2; value: string } | { type: 7; ip: string }> = [
    { type: 2, value: 'localhost' }, // DNS
    { type: 7, ip: '127.0.0.1' }, // IP
    { type: 7, ip: '::1' }, // IPv6 localhost
    ...localIPs.map(ip => ({ type: 7 as const, ip })), // Local network IPs
    ...altNames.filter(n => n.match(/^\d+\.\d+\.\d+\.\d+$/)).map(ip => ({ type: 7 as const, ip })), // Custom IPs
    ...altNames.filter(n => !n.match(/^\d+\.\d+\.\d+\.\d+$/)).map(dns => ({ type: 2 as const, value: dns })), // Custom DNS
  ];

  logger.info('[Certificates] Generating self-signed certificate...');
  logger.info(`[Certificates] Common Name: ${commonName}`);
  logger.info(`[Certificates] Alt Names: localhost, 127.0.0.1, ${localIPs.join(', ')}`);

  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'Hytale Server Manager' },
  ];

  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
      },
      {
        name: 'subjectAltName',
        altNames: allAltNames,
      },
    ],
    notAfterDate: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
  });

  // Write certificate and key files
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);

  // Set restrictive permissions on key file (Unix-like systems)
  try {
    fs.chmodSync(keyPath, 0o600);
  } catch {
    // Ignore on Windows
  }

  logger.info(`[Certificates] Certificate generated: ${certPath}`);
  logger.info(`[Certificates] Private key generated: ${keyPath}`);
  logger.info(`[Certificates] Certificate valid for ${validityDays} days`);

  return {
    certPath,
    keyPath,
    cert: pems.cert,
    key: pems.private,
    generated: true,
  };
}

/**
 * Load existing certificates or generate new ones
 */
export async function loadOrGenerateCertificates(options: CertificateOptions): Promise<CertificateInfo> {
  const { certsDir } = options;
  const certPath = path.join(certsDir, DEFAULT_CERT_FILENAME);
  const keyPath = path.join(certsDir, DEFAULT_KEY_FILENAME);

  // Check if certificates already exist
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    logger.info('[Certificates] Loading existing certificates');

    try {
      const cert = fs.readFileSync(certPath, 'utf8');
      const key = fs.readFileSync(keyPath, 'utf8');

      // Basic validation - check if files contain PEM data
      if (cert.includes('-----BEGIN CERTIFICATE-----') && key.includes('-----BEGIN')) {
        logger.info(`[Certificates] Loaded certificate from: ${certPath}`);
        return {
          certPath,
          keyPath,
          cert,
          key,
          generated: false,
        };
      }

      logger.warn('[Certificates] Existing certificates appear invalid, regenerating...');
    } catch (error) {
      logger.warn('[Certificates] Failed to read existing certificates, regenerating...');
    }
  }

  // Generate new certificates
  return generateCertificate(options);
}

/**
 * Load custom certificates from specified paths
 */
export function loadCustomCertificates(certPath: string, keyPath: string): CertificateInfo {
  logger.info(`[Certificates] Loading custom certificate from: ${certPath}`);

  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate file not found: ${certPath}`);
  }

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Key file not found: ${keyPath}`);
  }

  const cert = fs.readFileSync(certPath, 'utf8');
  const key = fs.readFileSync(keyPath, 'utf8');

  if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('Invalid certificate file format');
  }

  if (!key.includes('-----BEGIN')) {
    throw new Error('Invalid key file format');
  }

  logger.info('[Certificates] Custom certificates loaded successfully');

  return {
    certPath,
    keyPath,
    cert,
    key,
    generated: false,
  };
}
