# Windows Release & Packaging Invariants

1. **Binary Retention Policy (2-Version Limit):**
   - Strictly retain only the **latest 2 `.exe` files** in `releases/binaries/`:
     1. Current active / golden release (e.g. `AuraWave-3D-Setup-v1.4.0.exe`).
     2. Immediate previous release for instant rollback (e.g. `AuraWave-3D-Setup-v1.3.1.exe`).
   - Clean up intermediate alphas, dev builds, and older versions locally upon release promotion.

2. **Windows Executable Icon Invariant:**
   - Always provide a true multi-resolution `icon.ico` (RGBA layers: 256, 128, 64, 48, 32, 16) in `build/icon.ico` and set `directories.buildResources: "build"` in `package.json`.
   - Never rely on JPEG-encoded `.png` files or post-build `rcedit` modification on 7z SFX portable binaries (which corrupts the appended archive overlay).

3. **Mandatory Pre-Flight Assertions:**
   - Before compiling production installers, verify `payload.zip` exists and is >= 140 MB.
   - Before uploading to GitHub Releases, verify the output `.exe` is >= 200 MB.

4. **Wizard Mode Badging:**
   - Top titlebar subtitle badges must explicitly read `Installer` during setup and `Uninstaller` during maintenance/removal.
