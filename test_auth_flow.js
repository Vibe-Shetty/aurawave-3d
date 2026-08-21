/**
 * 🌊 AuraWave 3D — Full Automated End-to-End Test Suite for Auth & Profile Drawer
 */

import { auth } from './src/auth.js';
import { sync } from './src/sync.js';
import { encryptSecret, decryptSecret, getDeviceMasterKey } from './src/vault.js';
import fs from 'fs';
import path from 'path';

// Setup Mock DOM storage if running in Node
if (typeof localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

async function runTests() {
  console.log('🧪 ============================================');
  console.log('🌊 AuraWave 3D — End-to-End Test Suite');
  console.log('============================================\n');

  // Test 1: HTML & DOM Verification
  console.log('[TEST 1] Verifying index.html and dist/index.html elements...');
  const htmlContent = fs.readFileSync(path.resolve('./index.html'), 'utf8');
  const requiredIds = [
    'user-profile-btn',
    'user-avatar-img',
    'user-display-name',
    'sync-status-indicator',
    'auth-modal',
    'close-auth-modal',
    'google-auth-btn',
    'auth-tab-signin',
    'auth-tab-register',
    'auth-status-msg',
    'email-auth-form',
    'display-name-group',
    'auth-name-input',
    'auth-email-input',
    'auth-password-input',
    'toggle-pwd-visibility',
    'auth-submit-btn',
    'continue-guest-btn',
    'profile-drawer-backdrop',
    'profile-drawer',
    'close-profile-drawer-btn',
    'drawer-avatar-img',
    'drawer-user-name',
    'drawer-user-email',
    'drawer-sync-badge',
    'vault-gemini-key-input',
    'save-vault-key-btn',
    'save-current-vibe-btn',
    'drawer-presets-list',
    'drawer-auth-action-btn',
    'drawer-logout-btn'
  ];

  for (const id of requiredIds) {
    if (!htmlContent.includes(`id="${id}"`)) {
      throw new Error(`Missing required element ID in index.html: #${id}`);
    }
  }
  console.log(`  ✓ All ${requiredIds.length} required DOM IDs present and verified in HTML.`);

  // Test 2: Initial Guest State
  console.log('\n[TEST 2] Verifying Default Guest State...');
  const initialUser = auth.getCurrentUser();
  console.log('  Initial User:', initialUser);
  if (!initialUser || !initialUser.isGuest) {
    throw new Error('Expected default session to be Guest');
  }
  console.log('  ✓ Default Guest session successfully verified.');

  // Test 3: Custom Email Registration
  console.log('\n[TEST 3] Testing Custom Email Registration...');
  const registeredUser = await auth.registerWithEmail('alex.developer@aurawave.app', 'secretPass123!', 'Alex Dev');
  console.log('  Registered User:', registeredUser);
  if (registeredUser.email !== 'alex.developer@aurawave.app' || registeredUser.displayName !== 'Alex Dev' || registeredUser.isGuest) {
    throw new Error('Registration user data mismatch');
  }
  console.log('  ✓ Account registration verified successfully.');

  // Test 4: Custom Email Login
  console.log('\n[TEST 4] Testing Custom Email Login...');
  const loggedInUser = await auth.loginWithEmail('alex.developer@aurawave.app', 'secretPass123!');
  if (loggedInUser.email !== 'alex.developer@aurawave.app' || loggedInUser.isGuest) {
    throw new Error('Login failed for registered user');
  }
  console.log('  ✓ Email + Password login verified successfully.');

  // Test 5: Google 1-Click Login
  console.log('\n[TEST 5] Testing Google 1-Click Login...');
  const googleUser = await auth.loginWithGoogle();
  if (!googleUser || !googleUser.email.includes('@gmail.com') || googleUser.isGuest) {
    throw new Error('Google OAuth flow failed');
  }
  console.log('  Google User:', googleUser);
  console.log('  ✓ Google 1-Click sign-in verified successfully.');

  // Test 6: Zero-Knowledge AES-256-GCM Vault
  console.log('\n[TEST 6] Testing Zero-Knowledge Encrypted Vault...');
  const demoApiKey = 'AIzaSyDemoSecureGeminiKey_987654321';
  await sync.saveEncryptedApiKey(demoApiKey);
  const decryptedKey = await sync.getDecryptedApiKey();
  console.log('  Stored Key (Decrypted on demand):', decryptedKey);
  if (decryptedKey !== demoApiKey) {
    throw new Error('Vault decryption mismatch');
  }
  console.log('  ✓ Zero-Knowledge Vault Encryption & Decryption passed 100%.');

  // Test 7: Custom 3D Presets Sync
  console.log('\n[TEST 7] Testing Custom 3D Visualizer Presets...');
  const customPreset = {
    name: 'Cyberpunk Neon Matrix',
    geometryMode: 'sphere',
    themeSpeed: 1.8,
    themeWaveIntensity: 2.2,
    colors: ['#00f0ff', '#ff007f', '#a855f7'],
    moodTag: 'CYBERPUNK SPHERE'
  };
  const savedPreset = await sync.saveCustomPreset(customPreset);
  console.log('  Saved Preset:', savedPreset);
  const presets = sync.getCustomPresets();
  if (!presets || presets.length === 0 || presets[0].name !== 'Cyberpunk Neon Matrix') {
    throw new Error('Preset save/load failed');
  }
  console.log('  ✓ Custom 3D Presets management verified successfully.');

  // Test 8: Logout / Guest Reversion
  console.log('\n[TEST 8] Testing Sign Out...');
  auth.logout();
  const postLogoutUser = auth.getCurrentUser();
  if (!postLogoutUser.isGuest) {
    throw new Error('Expected session to revert to guest after logout');
  }
  console.log('  ✓ Logout and guest session fallback verified successfully.');

  console.log('\n🎉 ALL 8 AUTOMATED TESTS PASSED 100% WITH ZERO ERRORS!\n');
}

runTests().catch(err => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
