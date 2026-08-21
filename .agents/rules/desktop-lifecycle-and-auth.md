# Desktop Lifecycle, Uninstaller Clean-Slate & Google OAuth Invariants

## 1. Clean-Slate Desktop Uninstaller Lifecycle (Two Directories Rule)
In Windows/Electron desktop applications:
- **Program Files**: Reside in `AppData\Local\<AppName>` (binaries, asar, DLLs).
- **User Data & Session Profile**: Reside in `AppData\Roaming\<AppName>` (`localStorage`, IndexedDB, Google OAuth tokens, session tokens, and onboarding flags like `aurawave_onboarding_completed`).

### Mandatory Invariant:
When implementing an uninstaller (`uninstall-app`), you **MUST** explicitly purge both:
1. `targetDir` (`AppData\Local\<AppName>`)
2. `path.join(app.getPath('appData'), '<AppName>')` (`AppData\Roaming\<AppName>`)
3. `path.join(app.getPath('home'), 'AppData', 'Local', '<app-updater-cache>')`

*Rationale*: Failing to purge `AppData\Roaming` leaves old session tokens and onboarding flags intact on disk, which breaks fresh reinstallations by bypassing the first-launch welcome modal and keeping past user sessions logged in.

---

## 2. Atomic Release Pipelines & Version Assertion
When building dual-stage installers (Main App bundled -> zipped into `payload.zip` -> wrapped in React setup installer):
1. **Always Purge Before Compiling**: Delete all previous `.exe`, `dist/`, `dist-electron/`, and `payload.zip` artifacts before calling `electron-builder`.
2. **Exact Version Matching**: Do not use loose filename prefix searches (e.g. `files.find(f => f.startsWith('...'))`). Always match by exact version string (e.g. `1.5.0`) and verify file modification timestamps before publishing.

---

## 3. Desktop Google Identity Services (GIS) Origin Invariant
Google OAuth Client IDs strictly enforce JavaScript Authorized Origins (protocol + host + port):
- The internal desktop server in `electron/main.js` must **ALWAYS** bind to a static, registered port (e.g. `http://localhost:8005`) instead of ephemeral dynamic ports (`port 0`), preventing `Error 400: origin_mismatch`.
