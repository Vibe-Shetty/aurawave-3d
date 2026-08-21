# Electron Background Media & Player Controls

When orchestrating background audio/video streams in hidden Electron browser windows:

1. **Player API vs Raw Video DOM**:
   - Do NOT rely on `video.pause()`, `video.play()`, or `video.currentTime` on proprietary web players (e.g., YouTube watch pages).
   - Hook into the native player instance (e.g., `document.getElementById('movie_player')` or equivalent JavaScript API) using `pauseVideo()`, `playVideo()`, `seekTo(seconds, true)`, `getCurrentTime()`, `getDuration()`.

2. **Automated Ad Elimination**:
   - Detect ad state via player classes (`.ad-showing`, `.ad-interrupting`).
   - Immediately mute ad audio (`video.muted = true`) so no ad sound is emitted.
   - Click available skip buttons (`.ytp-ad-skip-button`, `.ytp-skip-ad-button`).
   - Fast-forward ad stream at 16x speed (`video.playbackRate = 16.0; video.currentTime = video.duration;`).
   - Suppress ad metadata from UI time updates.
