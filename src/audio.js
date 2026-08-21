import { state } from './state.js';
import { CURATED_STATIONS } from './streamDirectory.js';

// ============================================================================
// Core Audio Engine & Universal Routing
// ============================================================================

export function initAudio() {
  if (state.audioCtx) {
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(() => {});
    }
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContext();
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 256;
    state.analyser.smoothingTimeConstant = 0.82;
    state.dataArray = new Uint8Array(state.analyser.frequencyBinCount);

    // Initialize master audio element connection
    state.masterAudioElement = document.getElementById('master-audio');
    if (state.masterAudioElement) {
      state.masterAudioElement.volume = state.isMuted ? 0 : state.currentVolume;
      try {
        if (!state.mediaSourceNode) {
          state.mediaSourceNode = state.audioCtx.createMediaElementSource(state.masterAudioElement);
          state.mediaSourceNode.connect(state.analyser);
          state.analyser.connect(state.audioCtx.destination);
        }
      } catch (err) {
        console.warn("MediaElementSource initialization note:", err);
      }

      // Audio Element Event Listeners
      state.masterAudioElement.addEventListener('timeupdate', updateTimelineUI);
      state.masterAudioElement.addEventListener('ended', handleTrackEnded);
      state.masterAudioElement.addEventListener('play', () => {
        state.isPlaying = true;
        updatePlayButtonUI(true);
        updateDockTrackInfo();
      });
      state.masterAudioElement.addEventListener('pause', () => {
        if (state.audioSourceType !== 'synth' && state.audioSourceType !== 'mic') {
          state.isPlaying = false;
          updatePlayButtonUI(false);
        }
      });
      state.masterAudioElement.addEventListener('error', (e) => {
        console.warn("Audio stream event notice:", e);
      });
    }
  } catch (e) {
    console.warn("initAudio exception:", e);
  }
}

// ============================================================================
// Universal Direct Audio Player (YouTube & High-Fidelity Music Tracks)
// ============================================================================

export async function playYouTubeTrack(track) {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);
  stopLiveMic();

  const videoId = track.videoId || (track.streamUrl ? extractVideoIdFromUrl(track.streamUrl) : null);
  if (!videoId) {
    console.warn("Missing videoId for YouTube track:", track);
    return;
  }

  state.audioSourceType = 'youtube';
  state.currentStreamTrack = track;
  state.activeStationId = track.id || `yt-${videoId}`;
  state.youtubeCurrentTime = 0;
  state.youtubeDuration = track.duration || 210;
  state.isPlaying = true;
  updatePlayButtonUI(true);

  state.trackMeta = {
    title: track.title || 'YouTube Music',
    artist: track.artist || 'YouTube Creator',
    genre: track.genre || 'Web Audio',
    cover: track.cover || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    isLive: false,
    videoId: videoId,
    duration: track.duration || 210,
    streamUrl: `https://www.youtube.com/watch?v=${videoId}`
  };

  // Update center ambient HUD
  const centerTitle = document.getElementById('viral-tagline');
  const centerDesc = document.getElementById('vibe-description');
  const vibeTag = document.getElementById('vibe-tag');
  if (centerTitle) centerTitle.textContent = state.trackMeta.title;
  if (centerDesc) centerDesc.textContent = `${state.trackMeta.artist} • ${state.trackMeta.genre}`;
  if (vibeTag) vibeTag.textContent = 'HIGH-FIDELITY AUDIO STREAM';
  updateDockTrackInfo();
  updateTimelineUI();

  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.playYouTube === 'function') {
    try {
      if (state.masterAudioElement) {
        state.masterAudioElement.pause();
        state.masterAudioElement.src = '';
      }

      await window.electronAPI.playYouTube(videoId);

      if (window.electronAPI.onYouTubeTimeUpdate) {
        window.electronAPI.onYouTubeTimeUpdate((data) => {
          if (state.audioSourceType !== 'youtube') return;
          if (data && !data.isAd) {
            state.youtubeCurrentTime = data.currentTime || 0;
            if (data.duration && data.duration > 0) {
              state.youtubeDuration = data.duration;
              if (state.trackMeta) state.trackMeta.duration = data.duration;
            }
            if (typeof data.paused === 'boolean') {
              state.isPlaying = !data.paused;
              updatePlayButtonUI(state.isPlaying);
            }
            updateTimelineUI();
          }
        });
      }

      if (window.electronAPI.onYouTubeEnded) {
        window.electronAPI.onYouTubeEnded(() => {
          if (state.audioSourceType !== 'youtube') return;
          handleTrackEnded();
        });
      }

      if (typeof window.electronAPI.setYouTubeVolume === 'function') {
        window.electronAPI.setYouTubeVolume(state.isMuted ? 0 : state.currentVolume);
      }
    } catch (err) {
      console.warn("Electron playYouTube error:", err);
    }
  }
}

function extractVideoIdFromUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function stopBackgroundYouTube() {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.stopYouTube === 'function') {
    window.electronAPI.stopYouTube().catch(() => {});
  }
}

// ============================================================================
// Universal 24/7 Radio Stream Player
// ============================================================================

export async function playStream(stationOrTrack) {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);
  stopLiveMic();
  stopBackgroundYouTube();

  // Route YouTube tracks to direct YouTube resolver
  if (stationOrTrack.isYouTube || stationOrTrack.videoId) {
    await playYouTubeTrack(stationOrTrack);
    return;
  }

  state.audioSourceType = 'stream';
  state.currentStreamTrack = stationOrTrack;
  state.activeStationId = stationOrTrack.id || 'custom';
  
  state.trackMeta = {
    title: stationOrTrack.title || 'Live Online Stream',
    artist: stationOrTrack.artist || '24/7 Internet Radio',
    genre: stationOrTrack.genre || 'Live Stream',
    cover: stationOrTrack.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    isLive: (stationOrTrack.isLive !== false),
    duration: stationOrTrack.duration || 0,
    streamUrl: stationOrTrack.streamUrl
  };

  // Update center ambient HUD
  const centerTitle = document.getElementById('viral-tagline');
  const centerDesc = document.getElementById('vibe-description');
  const vibeTag = document.getElementById('vibe-tag');
  if (centerTitle) centerTitle.textContent = state.trackMeta.title;
  if (centerDesc) centerDesc.textContent = `${state.trackMeta.artist} • ${state.trackMeta.genre}`;
  if (vibeTag) vibeTag.textContent = `${(state.trackMeta.genre || 'STREAM').toUpperCase()} FREQUENCY`;

  if (state.masterAudioElement && stationOrTrack.streamUrl) {
    state.masterAudioElement.src = stationOrTrack.streamUrl;
    state.masterAudioElement.load();
    try {
      await state.masterAudioElement.play();
      state.isPlaying = true;
      updatePlayButtonUI(true);
      updateDockTrackInfo();
    } catch (err) {
      console.warn("Stream autoplay note:", err);
      state.isPlaying = true;
      updatePlayButtonUI(true);
      updateDockTrackInfo();
    }
  }
}

// ============================================================================
// Local Uploaded MP3 & Playlist Track Player
// ============================================================================

export function playUploadedTrack(index) {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);
  stopLiveMic();
  stopBackgroundYouTube();

  if (!Array.isArray(state.playlist) || state.playlist.length === 0) return;
  if (index < 0 || index >= state.playlist.length) index = 0;

  state.currentTrackIndex = index;
  state.audioSourceType = 'playlist';
  const track = state.playlist[index];
  const audioSrc = track.url || track.streamUrl;

  state.trackMeta = {
    title: track.title || track.name || 'Local Track',
    artist: track.artist || 'Local Audio',
    genre: track.genre || 'Local File',
    cover: track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    isLive: false,
    duration: track.duration || 0,
    streamUrl: audioSrc
  };

  // Update center ambient HUD
  const centerTitle = document.getElementById('viral-tagline');
  const centerDesc = document.getElementById('vibe-description');
  const vibeTag = document.getElementById('vibe-tag');
  if (centerTitle) centerTitle.textContent = state.trackMeta.title;
  if (centerDesc) centerDesc.textContent = `${state.trackMeta.artist} • ${state.trackMeta.genre}`;
  if (vibeTag) vibeTag.textContent = 'LOCAL AUDIO PLAYBACK';

  if (state.masterAudioElement && audioSrc) {
    state.masterAudioElement.src = audioSrc;
    state.masterAudioElement.load();
    state.masterAudioElement.play().then(() => {
      state.isPlaying = true;
      updatePlayButtonUI(true);
      updateDockTrackInfo();
    }).catch(err => {
      console.warn("Local track playback note:", err);
      state.isPlaying = true;
      updatePlayButtonUI(true);
      updateDockTrackInfo();
    });
  }
}

// ============================================================================
// Live DJ & Room Microphone Mode
// ============================================================================

export async function startLiveMic() {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);
  stopBackgroundYouTube();
  if (state.masterAudioElement) state.masterAudioElement.pause();

  state.audioSourceType = 'mic';
  state.trackMeta = {
    title: 'Live DJ & Room Audio',
    artist: 'Direct System Microphone',
    genre: 'Live Input',
    cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&auto=format&fit=crop&q=80',
    isLive: true,
    streamUrl: ''
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    state.liveMicStream = stream;
    state.liveMicNode = state.audioCtx.createMediaStreamSource(stream);
    state.liveMicNode.connect(state.analyser);
    state.isPlaying = true;
    updatePlayButtonUI(true);
    updateDockTrackInfo();
  } catch (err) {
    console.error("Microphone access notice:", err);
  }
}

export function stopLiveMic() {
  if (state.liveMicStream) {
    state.liveMicStream.getTracks().forEach(t => t.stop());
    state.liveMicStream = null;
  }
  if (state.liveMicNode) {
    try { state.liveMicNode.disconnect(); } catch (e) {}
    state.liveMicNode = null;
  }
}

// ============================================================================
// Procedural Multi-Genre Synth Engine
// ============================================================================

export function startSynthEngine(genre) {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);
  stopLiveMic();
  stopBackgroundYouTube();
  if (state.masterAudioElement) state.masterAudioElement.pause();

  state.audioSourceType = 'synth';
  state.selectedPreset = genre;
  state.trackMeta = {
    title: `${genre.toUpperCase()} Generative Synth`,
    artist: 'AuraWave Procedural Audio Engine',
    genre: 'Generative AI Synth',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    isLive: true,
    streamUrl: ''
  };

  state.isPlaying = true;
  updatePlayButtonUI(true);
  updateDockTrackInfo();

  state.synthTimeElapsed = 0;
  state.synthTimer = setInterval(() => {
    if (!state.isPlaying || state.audioSourceType !== 'synth') {
      clearInterval(state.synthTimer);
      return;
    }
    state.synthTimeElapsed += 0.05;
    const t = state.synthTimeElapsed;

    if (state.dataArray) {
      for (let i = 0; i < state.dataArray.length; i++) {
        let v = 0;
        if (genre === 'cyberpunk') {
          v = Math.sin(t * 4 + i * 0.15) * 80 + Math.cos(t * 8 + i * 0.3) * 60 + 110;
        } else if (genre === 'lofi') {
          v = Math.sin(t * 1.5 + i * 0.1) * 50 + Math.cos(t * 2.5 + i * 0.05) * 40 + 90;
        } else if (genre === 'ambient') {
          v = Math.sin(t * 0.8 + i * 0.05) * 60 + 80;
        } else {
          v = Math.sin(t * 6 + i * 0.2) * 90 + Math.cos(t * 12 + i * 0.4) * 50 + 115;
        }
        state.dataArray[i] = Math.max(0, Math.min(255, Math.floor(v)));
      }
    }
  }, 50);
}

// ============================================================================
// Playback Control & Transport Actions
// ============================================================================

export function togglePlayPause() {
  initAudio();

  if (state.audioSourceType === 'synth') {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) startSynthEngine(state.selectedPreset || 'cyberpunk');
    updatePlayButtonUI(state.isPlaying);
    return;
  }

  if (state.audioSourceType === 'mic') {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) startLiveMic();
    else stopLiveMic();
    updatePlayButtonUI(state.isPlaying);
    return;
  }

  if (state.audioSourceType === 'youtube') {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.resumeYouTube === 'function') {
        window.electronAPI.resumeYouTube().catch(() => {});
      }
    } else {
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.pauseYouTube === 'function') {
        window.electronAPI.pauseYouTube().catch(() => {});
      }
    }
    updatePlayButtonUI(state.isPlaying);
    return;
  }

  if (state.masterAudioElement) {
    if (state.masterAudioElement.paused) {
      state.masterAudioElement.play().then(() => {
        state.isPlaying = true;
        updatePlayButtonUI(true);
      }).catch(() => {});
    } else {
      state.masterAudioElement.pause();
      state.isPlaying = false;
      updatePlayButtonUI(false);
    }
  }
}

export function handleTrackEnded() {
  if (state.audioSourceType === 'playlist' && Array.isArray(state.playlist) && state.playlist.length > 0) {
    if (state.isShuffle) {
      const nextIndex = Math.floor(Math.random() * state.playlist.length);
      playUploadedTrack(nextIndex);
    } else if (state.currentTrackIndex < state.playlist.length - 1) {
      playUploadedTrack(state.currentTrackIndex + 1);
    } else if (state.repeatMode === 'all') {
      playUploadedTrack(0);
    } else {
      state.isPlaying = false;
      updatePlayButtonUI(false);
    }
  }
}

// ============================================================================
// Timeline & HUD UI Updaters
// ============================================================================

export function updateTimelineUI() {
  const curTimeEl = document.getElementById('current-time');
  const totalDurEl = document.getElementById('total-duration');
  const progBar = document.getElementById('timeline-progress');
  const handle = document.getElementById('timeline-handle');
  const bufferedBar = document.getElementById('timeline-buffered');

  if (state.trackMeta && state.trackMeta.isLive) {
    if (curTimeEl) curTimeEl.textContent = 'LIVE';
    if (totalDurEl) totalDurEl.textContent = '24/7';
    if (progBar) progBar.style.width = '100%';
    if (handle) handle.style.left = '100%';
    return;
  }

  if (state.audioSourceType === 'youtube') {
    const current = state.youtubeCurrentTime || 0;
    const duration = state.youtubeDuration || state.trackMeta?.duration || 210;

    if (curTimeEl) curTimeEl.textContent = formatTime(current);
    if (totalDurEl) totalDurEl.textContent = duration > 0 ? formatTime(duration) : '0:00';

    if (duration > 0 && !state.isDraggingScrubber) {
      const pct = Math.min(100, Math.max(0, (current / duration) * 100));
      if (progBar) progBar.style.width = `${pct}%`;
      if (handle) handle.style.left = `${pct}%`;
    }
    return;
  }

  if (state.masterAudioElement) {
    const current = state.masterAudioElement.currentTime || 0;
    const duration = state.masterAudioElement.duration || state.trackMeta?.duration || 0;

    if (curTimeEl) curTimeEl.textContent = formatTime(current);
    if (totalDurEl) totalDurEl.textContent = duration > 0 ? formatTime(duration) : '0:00';

    if (duration > 0 && !state.isDraggingScrubber) {
      const pct = Math.min(100, Math.max(0, (current / duration) * 100));
      if (progBar) progBar.style.width = `${pct}%`;
      if (handle) handle.style.left = `${pct}%`;
    }

    // Update buffer bar
    if (bufferedBar && state.masterAudioElement.buffered && state.masterAudioElement.buffered.length > 0 && duration > 0) {
      const bufferedEnd = state.masterAudioElement.buffered.end(state.masterAudioElement.buffered.length - 1);
      const bufPct = Math.min(100, (bufferedEnd / duration) * 100);
      bufferedBar.style.width = `${bufPct}%`;
    }
  }
}

export function updatePlayButtonUI(isPlaying) {
  const playBtn = document.getElementById('play-toggle');
  if (playBtn) {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    playBtn.title = isPlaying ? 'Pause (Space)' : 'Play (Space)';
  }
}

export function updateDockTrackInfo() {
  const titleEl = document.getElementById('dock-title');
  const artistEl = document.getElementById('dock-artist');
  const coverEl = document.getElementById('dock-cover-img');
  const liveBadge = document.getElementById('dock-live-badge');

  if (state.trackMeta) {
    if (titleEl) titleEl.textContent = state.trackMeta.title || 'Untitled Track';
    if (artistEl) artistEl.textContent = `${state.trackMeta.artist || 'AuraWave'} • ${state.trackMeta.genre || 'Soundscape'}`;
    if (coverEl && state.trackMeta.cover) coverEl.src = state.trackMeta.cover;
    if (liveBadge) liveBadge.style.display = state.trackMeta.isLive ? 'inline-flex' : 'none';
  }
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

if (typeof window !== 'undefined') {
  window.playStream = playStream;
  window.playYouTubeTrack = playYouTubeTrack;
  window.initAudio = initAudio;
}

