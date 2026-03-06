import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Credential Encryption Utilities
 * Session 91: Application-level encryption for integration credentials
 *
 * Uses AES-256-GCM (authenticated encryption) with a key derived from env variable.
 * Encrypted credentials are stored as:
 * {
 *   encrypted: true,
 *   data: "base64-encoded-ciphertext",
 *   iv: "base64-initialization-vector",
 *   authTag: "base64-authentication-tag",
 *   version: "1"
 * }
 *
 * For backwards compatibility, plaintext credentials (objects without 'encrypted' field)
 * are still supported by all resolver functions.
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_VERSION = '1'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const _AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Derive encryption key from environment variable
 * Uses scrypt for key derivation to ensure proper key length
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY

  if (!secret) {
    throw new Error(
      'INTEGRATION_CREDENTIALS_ENCRYPTION_KEY environment variable is not set. ' +
        'Credential encryption is enabled but no key is configured.'
    )
  }

  // Use scrypt to derive a 256-bit key from the secret
  // Salt is static since we want the same key each time
  const salt = 'bos-integrations-v1'
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Check if encryption is enabled
 * Returns false if no encryption key is configured
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY
}

/**
 * Encrypt credentials object
 * Returns encrypted format or throws error if encryption key not configured
 */
export function encryptCredentials(
  raw: Record<string, unknown>
): Record<string, unknown> {
  // If encryption not enabled, return plaintext with warning
  if (!isEncryptionEnabled()) {
    console.warn(
      '[Credentials Encryption] Encryption key not configured. Storing credentials in plaintext. ' +
        'Set INTEGRATION_CREDENTIALS_ENCRYPTION_KEY to enable encryption.'
    )
    return raw
  }

  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)

    // Serialize credentials to JSON
    const plaintext = JSON.stringify(raw)

    // Encrypt
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Return encrypted object
    return {
      encrypted: true,
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: ENCRYPTION_VERSION,
    }
  } catch (error) {
    console.error('[Credentials Encryption] Failed to encrypt credentials:', error)
    throw new Error('Failed to encrypt credentials. Check encryption configuration.')
  }
}

/**
 * Decrypt credentials object
 * Returns plaintext credentials object
 * Handles both encrypted and plaintext formats for backwards compatibility
 */
export function decryptCredentials(
  stored: Record<string, unknown>
): Record<string, unknown> {
  console.log('[Credentials Encryption] Decrypting, isEncrypted:', stored.encrypted === true)
  
  // Check if this is encrypted data
  if (!stored.encrypted || stored.encrypted !== true) {
    // Plaintext format - return as-is for backwards compatibility
    console.log('[Credentials Encryption] Plaintext format, returning as-is')
    return stored
  }

  // Encrypted format - decrypt it
  console.log('[Credentials Encryption] Encrypted format, decrypting...')
  console.log('[Credentials Encryption] Has encryption key:', isEncryptionEnabled())
  
  try {
    const key = getEncryptionKey()

    // Extract encrypted components
    const data = Buffer.from(stored.data as string, 'base64')
    const iv = Buffer.from(stored.iv as string, 'base64')
    const authTag = Buffer.from(stored.authTag as string, 'base64')

    // Decrypt
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])

    // Parse JSON
    const plaintext = JSON.parse(decrypted.toString('utf8'))
    
    console.log('[Credentials Encryption] Decryption successful, keys:', Object.keys(plaintext))

    return plaintext as Record<string, unknown>
  } catch (error) {
    const keySet = isEncryptionEnabled()
    if (!keySet) {
      console.error('[Credentials Encryption] Decryption failed: INTEGRATION_CREDENTIALS_ENCRYPTION_KEY is not set but credentials are encrypted')
    } else {
      console.error('[Credentials Encryption] Decryption failed: key mismatch or corrupted data. Key is set but decryption threw:', error)
    }
    // Return empty object so callers can fall through to env var fallback
    // rather than crashing the entire integrations page
    return {}
  }
}

/**
 * Check if credentials object is encrypted
 */
export function isCredentialsEncrypted(
  credentials: Record<string, unknown>
): boolean {
  return credentials.encrypted === true
}

/**
 * Encrypt only if encryption is enabled, otherwise return plaintext
 * Safe wrapper for encryptCredentials that doesn't throw
 */
export function encryptCredentialsSafe(
  raw: Record<string, unknown>
): Record<string, unknown> {
  if (!isEncryptionEnabled()) {
    return raw
  }
  return encryptCredentials(raw)
}

/**
 * Get encryption status for display/logging
 */
export function getEncryptionStatus(): {
  enabled: boolean
  algorithm: string
  version: string
} {
  return {
    enabled: isEncryptionEnabled(),
    algorithm: ENCRYPTION_ALGORITHM,
    version: ENCRYPTION_VERSION,
  }
}
