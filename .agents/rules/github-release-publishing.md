# GitHub Production Release Protocol

Whenever publishing a new version or pushing updates intended for production distribution, execute this complete checklist:

1. **Build Binaries**: Run `node build-production-release.js` to compile Vite assets, package Electron, and build the installer into `scratch/ai-workspace/releases/binaries/`.
2. **Sync README.md**: Update the "What's New in vX.X.X" section, download links, and version badges on the repository home page.
3. **Commit & Push to Main**: Stage all source and documentation changes (`git add .`, `git commit`, `git push origin main`).
4. **Update GitHub Release**: Run `gh release edit vX.X.X` or `gh release create vX.X.X` with detailed changelog notes.
5. **Upload Release Assets**: Run `gh release upload vX.X.X <installer-path> --clobber` to attach fresh `.exe` binaries.
6. **Sync Tags**: Ensure git tags match the latest commit (`git tag -f -a vX.X.X -m "..." && git push origin vX.X.X --force`).
