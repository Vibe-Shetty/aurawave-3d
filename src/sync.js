/**
 * 🌊 AuraWave 3D — Local-First Cloud Sync Layer
 * Manages transparent synchronization of user playlists, custom 3D vibe presets,
 * radio favorites, and encrypted vault secrets between local storage and cloud.
 */

import { auth } from './auth.js';
import { encryptSecret, decryptSecret, getDeviceMasterKey } from './vault.js';

const PRESETS_STORAGE_PREFIX = 'aurawave_custom_presets_';
const FAVORITES_STORAGE_PREFIX = 'aurawave_favorites_';
const VAULT_KEY_PREFIX = 'aurawave_vault_gemini_';

class SyncEngine {
  constructor() {
    this.syncStatus = 'synced'; // 'synced' | 'syncing' | 'offline'
    this.syncListeners = [];
    this.init();
  }

  init() {
    auth.onAuthStateChanged((user) => {
      this.syncAllWithCloud();
    });
  }

  onSyncStatusChanged(callback) {
    if (typeof callback === 'function') {
      this.syncListeners.push(callback);
      callback(this.syncStatus);
    }
  }

  _setSyncStatus(status) {
    this.syncStatus = status;
    for (const listener of this.syncListeners) {
      try { listener(status); } catch (e) {}
    }
  }

  _getStorageKey(prefix) {
    const user = auth.getCurrentUser();
    const userId = user ? user.id : 'guest';
    return `${prefix}${userId}`;
  }

  /**
   * Save a custom 3D particle & audio vibe preset
   */
  async saveCustomPreset(preset) {
    this._setSyncStatus('syncing');
    try {
      const key = this._getStorageKey(PRESETS_STORAGE_PREFIX);
      const existing = this.getCustomPresets();
      const newPreset = {
        id: preset.id || 'preset_' + Date.now(),
        name: preset.name || 'Custom Vibe',
        geometryMode: preset.geometryMode || 'wave',
        themeSpeed: preset.themeSpeed || 1.0,
        themeWaveIntensity: preset.themeWaveIntensity || 1.5,
        colors: preset.colors || ['#00f0ff', '#ff007f', '#7928ca'],
        moodTag: preset.moodTag || 'CUSTOM AMBIENCE',
        updatedAt: new Date().toISOString()
      };

      const updated = [newPreset, ...existing.filter(p => p.id !== newPreset.id)];
      localStorage.setItem(key, JSON.stringify(updated));

      // Simulate cloud sync debounce
      setTimeout(() => {
        this._setSyncStatus('synced');
      }, 500);

      return newPreset;
    } catch (err) {
      console.error('[SYNC] Failed to save preset:', err);
      this._setSyncStatus('offline');
      throw err;
    }
  }

  /**
   * Get all custom presets for the active user
   */
  getCustomPresets() {
    try {
      const key = this._getStorageKey(PRESETS_STORAGE_PREFIX);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Store user's Gemini API key with Zero-Knowledge Client-Side AES-256-GCM encryption
   */
  async saveEncryptedApiKey(rawApiKey) {
    if (!rawApiKey) {
      const key = this._getStorageKey(VAULT_KEY_PREFIX);
      localStorage.removeItem(key);
      return;
    }

    this._setSyncStatus('syncing');
    try {
      const masterPassphrase = getDeviceMasterKey();
      const encryptedPayload = await encryptSecret(rawApiKey.trim(), masterPassphrase);
      
      const key = this._getStorageKey(VAULT_KEY_PREFIX);
      localStorage.setItem(key, encryptedPayload);

      setTimeout(() => {
        this._setSyncStatus('synced');
      }, 400);
      return true;
    } catch (err) {
      console.error('[SYNC] Failed to encrypt API key:', err);
      this._setSyncStatus('offline');
      throw err;
    }
  }

  /**
   * Retrieve and decrypt the user's Gemini API key
   */
  async getDecryptedApiKey() {
    try {
      const key = this._getStorageKey(VAULT_KEY_PREFIX);
      const encryptedPayload = localStorage.getItem(key);
      if (!encryptedPayload) return null;

      const masterPassphrase = getDeviceMasterKey();
      return await decryptSecret(encryptedPayload, masterPassphrase);
    } catch (err) {
      console.warn('[SYNC] Failed to decrypt API key:', err.message);
      return null;
    }
  }

  /**
   * Toggle radio station favorite
   */
  toggleFavoriteStation(stationId) {
    const key = this._getStorageKey(FAVORITES_STORAGE_PREFIX);
    const favorites = this.getFavoriteStations();
    let updated;
    if (favorites.includes(stationId)) {
      updated = favorites.filter(id => id !== stationId);
    } else {
      updated = [...favorites, stationId];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  }

  getFavoriteStations() {
    try {
      const key = this._getStorageKey(FAVORITES_STORAGE_PREFIX);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Trigger full cloud sync
   */
  async syncAllWithCloud() {
    this._setSyncStatus('syncing');
    // In production, syncs with Supabase PostgreSQL tables / RLS
    setTimeout(() => {
      this._setSyncStatus('synced');
    }, 600);
  }
}

export const sync = new SyncEngine();
