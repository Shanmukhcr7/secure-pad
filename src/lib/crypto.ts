/**
 * AES Encryption Utility using Web Crypto API
 * Mirrors the Spring Boot AES/CBC/PKCS5Padding approach
 * Uses SHA-256 hash of passphrase, trimmed to 16 bytes for AES-128
 */

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // SHA-256 hash the passphrase
  const hashBuffer = await crypto.subtle.digest('SHA-256', passphraseBytes);

  // Take first 16 bytes for AES-128
  const keyBytes = new Uint8Array(hashBuffer).slice(0, 16);

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptNote(content: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    encoder.encode(content)
  );

  // Prepend IV to encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

export async function decryptNote(encryptedBase64: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  // Extract IV (first 16 bytes)
  const iv = combined.slice(0, 16);
  const encryptedData = combined.slice(16);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Invalid passphrase');
  }
}

export function generateNoteKey(): string {
  return crypto.randomUUID();
}
