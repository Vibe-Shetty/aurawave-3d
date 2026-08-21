/**
 * 🌊 AuraWave 3D — Zero-Knowledge Client-Side Cryptographic Vault
 * Uses Web Crypto API (window.crypto.subtle) with AES-256-GCM and PBKDF2 key derivation.
 * Sensitive data (e.g., Gemini API keys) are encrypted before writing to storage/cloud.
 */

const SALT_SIZE = 16; // 128 bits
const IV_SIZE = 12;   // 96 bits for AES-GCM
const ITERATIONS = 100000;

// Convert Buffer/Array to Hex/Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive an AES-GCM CryptoKey from a user passphrase and salt using PBKDF2
 */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} plaintext - Plain text (e.g. Gemini API Key)
 * @param {string} passphrase - User secret / master token
 * @returns {Promise<string>} Base64 formatted JSON payload containing salt, iv, and ciphertext
 */
export async function encryptSecret(plaintext, passphrase) {
  if (!plaintext || !passphrase) throw new Error('Missing plaintext or passphrase for encryption');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );

  const payload = {
    v: 1, // version
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(ciphertextBuffer)
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt a ciphertext string using AES-256-GCM
 * @param {string} encryptedJsonString - Base64 formatted JSON payload
 * @param {string} passphrase - User secret / master token
 * @returns {Promise<string>} Plain text
 */
export async function decryptSecret(encryptedJsonString, passphrase) {
  if (!encryptedJsonString || !passphrase) return null;

  try {
    const payload = JSON.parse(encryptedJsonString);
    if (!payload.salt || !payload.iv || !payload.data) {
      throw new Error('Invalid vault payload format');
    }

    const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const ciphertext = base64ToArrayBuffer(payload.data);

    const key = await deriveKey(passphrase, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('[VAULT] Decryption failed:', err.message);
    throw new Error('Decryption failed. Invalid credentials or corrupted vault data.');
  }
}

/**
 * Get device master vault key (persistent local seed for transparent device encryption)
 */
export function getDeviceMasterKey() {
  let key = localStorage.getItem('aurawave_device_master_key');
  if (!key) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    key = arrayBufferToBase64(randomBytes);
    localStorage.setItem('aurawave_device_master_key', key);
  }
  return key;
}
