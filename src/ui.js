import { state } from './state.js';
// ============================================================================
// 5. Playlist & Media Player Controller Logic
// ============================================================================

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updatePlayButtonUI(playing) {
  const playToggle = document.getElementById('play-toggle');
  if (playToggle) {
    playToggle.textContent = playing ? '❚❚' : '▶';
    playToggle.title = playing ? 'Pause (Space)' : 'Play (Space)';
  }
}

function showTrackDetails(track) {
  const chip = document.getElementById('uploaded-track-chip');
  const titleEl = document.getElementById('chip-title');
  const metaEl = document.getElementById('chip-meta');
  const viralTitleEl = document.getElementById('viral-tagline');
  const vibeTagEl = document.getElementById('vibe-tag');

  if (chip && titleEl && metaEl) {
    titleEl.textContent = track.title;
    metaEl.textContent = `${track.artist} • ${track.language || track.genre}`;
    chip.style.display = 'flex';
  }

  if (viralTitleEl) {
    viralTitleEl.textContent = track.title;
  }

  if (vibeTagEl) {
    vibeTagEl.textContent = `${track.genre || 'Audio Experience'} • AuraWave`;
  }
}

function playTrack(index) {
  if (index < 0 || index >= state.playlist.length) return;
  state.currentTrackIndex = index;
  const track = state.playlist[state.currentTrackIndex];

  initAudio();
  showTrackDetails(track);

  const audioSourceSelect = document.getElementById('audio-source');

  state.audioSourceType = 'playlist';
  if (audioSourceSelect) audioSourceSelect.value = 'playlist';
  if (state.synthTimer) clearInterval(state.synthTimer);

  if (state.masterAudioElement) {
    if (state.masterAudioElement.src !== track.url) {
      state.masterAudioElement.src = track.url;
    }
    state.masterAudioElement.currentTime = 0; // Force restart from beginning
    state.masterAudioElement.play().catch(e => console.log("Play error:", e));
    state.isPlaying = true;
    updatePlayButtonUI(true);
  }

  renderPlaylistDrawer();
}

function togglePlayPause() {
  initAudio();
  if (state.isPlaying) {
    stopAudio();
  } else {
    state.isPlaying = true;
    updatePlayButtonUI(true);
    
    if (state.audioSourceType === 'synth') {
      startSynthEngine(state.selectedPreset);
    } else if (state.audioSourceType === 'playlist') {
      if (state.playlist.length > 0) {
        playTrack(state.currentTrackIndex);
      } else {
        alert("Playlist is empty. Please upload some songs.");
        state.isPlaying = false;
        updatePlayButtonUI(false);
      }
    } else if (state.audioSourceType === 'mic') {
      startMicInput();
    }
  }
}

function nextTrack() {
  if (state.audioSourceType === 'synth') {
    const idx = state.SYNTH_PRESETS.indexOf(state.selectedPreset);
    state.selectedPreset = state.SYNTH_PRESETS[(idx + 1) % state.SYNTH_PRESETS.length];
    const synthPresetSelect = document.getElementById('synth-preset');
    if (synthPresetSelect) synthPresetSelect.value = state.selectedPreset;
    if (state.isPlaying) startSynthEngine(state.selectedPreset);
    return;
  }

  if (state.playlist.length === 0) return;
  let nextIdx = state.currentTrackIndex + 1;
  if (state.isShuffle && state.playlist.length > 1) {
    do {
      nextIdx = Math.floor(Math.random() * state.playlist.length);
    } while (nextIdx === state.currentTrackIndex);
  } else if (nextIdx >= state.playlist.length) {
    nextIdx = 0;
  }
  playTrack(nextIdx);
}

function prevTrack() {
  if (state.audioSourceType === 'synth') {
    const idx = state.SYNTH_PRESETS.indexOf(state.selectedPreset);
    state.selectedPreset = state.SYNTH_PRESETS[(idx - 1 + state.SYNTH_PRESETS.length) % state.SYNTH_PRESETS.length];
    const synthPresetSelect = document.getElementById('synth-preset');
    if (synthPresetSelect) synthPresetSelect.value = state.selectedPreset;
    if (state.isPlaying) startSynthEngine(state.selectedPreset);
    return;
  }

  if (state.playlist.length === 0) return;
  if (state.audioSourceType === 'playlist' && state.masterAudioElement && state.masterAudioElement.currentTime > 3) {
    state.masterAudioElement.currentTime = 0;
    return;
  }
  let prevIdx = state.currentTrackIndex - 1;
  if (prevIdx < 0) {
    prevIdx = state.playlist.length - 1;
  }
  playTrack(prevIdx);
}

function seekRelative(seconds) {
  if (state.audioSourceType === 'playlist' && state.masterAudioElement) {
    state.masterAudioElement.currentTime = Math.max(0, Math.min(state.masterAudioElement.duration || 0, state.masterAudioElement.currentTime + seconds));
    updateTimeline();
  } else if (state.audioSourceType === 'synth') {
    const track = state.playlist[state.currentTrackIndex];
    const dur = (track && track.duration) || 180;
    state.synthTimeElapsed = Math.max(0, Math.min(dur, state.synthTimeElapsed + seconds));
    updateTimeline();
  }
}

function handleTrackEnded() {
  if (state.repeatMode === 'one') {
    playTrack(state.currentTrackIndex);
  } else if (state.repeatMode === 'all') {
    nextTrack();
  } else {
    if (state.currentTrackIndex < state.playlist.length - 1) {
      nextTrack();
    } else {
      stopAudio();
    }
  }
}

function updateTimeline() {
  if (state.isDraggingScrubber) return;

  const currentLabel = document.getElementById('current-time');
  const totalLabel = document.getElementById('total-duration');
  const progressEl = document.getElementById('timeline-progress');
  const handleEl = document.getElementById('timeline-handle');
  const bufferedEl = document.getElementById('timeline-buffered');

  let cur = 0;
  let dur = 0;

  if (state.audioSourceType === 'playlist' && state.masterAudioElement) {
    cur = state.masterAudioElement.currentTime || 0;
    dur = state.masterAudioElement.duration || 0;

    if (state.masterAudioElement.buffered && state.masterAudioElement.buffered.length > 0) {
      const bufferedEnd = state.masterAudioElement.buffered.end(state.masterAudioElement.buffered.length - 1);
      const bufPct = (bufferedEnd / (dur || 1)) * 100;
      if (bufferedEl) bufferedEl.style.width = `${bufPct}%`;
    }
  } else if (state.audioSourceType === 'synth') {
    const track = state.playlist[state.currentTrackIndex];
    dur = (track && track.duration) || 180;
    cur = state.synthTimeElapsed % dur;
  }

  const pct = dur > 0 ? (cur / dur) * 100 : 0;

  if (currentLabel) currentLabel.textContent = formatTime(cur);
  if (totalLabel) totalLabel.textContent = formatTime(dur);
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (handleEl) handleEl.style.left = `${pct}%`;
}

// Scrubber Click & Drag Seek
const timelineContainer = document.getElementById('timeline-container');
if (timelineContainer) {
  let dragRatio = 0;

  function updateVisualScrubber(e) {
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    dragRatio = clickX / rect.width;

    // Update visuals immediately without triggering timeupdate loops
    const progressEl = document.getElementById('timeline-progress');
    const handleEl = document.getElementById('timeline-handle');
    const currentLabel = document.getElementById('current-time');

    if (progressEl) progressEl.style.width = `${dragRatio * 100}%`;
    if (handleEl) handleEl.style.left = `${dragRatio * 100}%`;

    // Update state.time label visually
    let dur = 180;
    if (state.audioSourceType === 'playlist' && state.masterAudioElement && state.masterAudioElement.duration) {
      dur = state.masterAudioElement.duration;
    } else if (state.audioSourceType === 'synth') {
      const track = state.playlist[state.currentTrackIndex];
      if (track && track.duration) dur = track.duration;
    }
    if (currentLabel) currentLabel.textContent = formatTime(dragRatio * dur);
  }

  function commitSeek() {
    if (state.audioSourceType === 'playlist' && state.masterAudioElement && state.masterAudioElement.duration) {
      state.masterAudioElement.currentTime = dragRatio * state.masterAudioElement.duration;
    } else if (state.audioSourceType === 'synth') {
      const track = state.playlist[state.currentTrackIndex];
      const dur = (track && track.duration) || 180;
      state.synthTimeElapsed = dragRatio * dur;
    }
    state.isDraggingScrubber = false; // Reset before updateTimeline so it updates
    updateTimeline();
  }

  timelineContainer.addEventListener('mousedown', (e) => {
    state.isDraggingScrubber = true;
    updateVisualScrubber(e);
    const onMouseMove = (ev) => updateVisualScrubber(ev);
    const onMouseUp = () => {
      commitSeek();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

// ============================================================================
// 6. Volume, Shuffle & Repeat Controls
// ============================================================================

const volumeSlider = document.getElementById('volume-slider');
const volumeBtn = document.getElementById('volume-btn');

function setVolume(val) {
  state.currentVolume = parseFloat(val);
  state.isMuted = state.currentVolume === 0;
  if (state.masterAudioElement) {
    state.masterAudioElement.volume = state.currentVolume;
  }
  updateVolumeUI();
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  if (state.masterAudioElement) {
    state.masterAudioElement.volume = state.isMuted ? 0 : state.currentVolume;
  }
  if (volumeSlider) {
    volumeSlider.value = state.isMuted ? 0 : state.currentVolume;
  }
  updateVolumeUI();
}

function updateVolumeUI() {
  if (volumeBtn) {
    if (state.isMuted || state.currentVolume === 0) {
      volumeBtn.textContent = '🔇';
    } else if (state.currentVolume < 0.5) {
      volumeBtn.textContent = '🔉';
    } else {
      volumeBtn.textContent = '🔊';
    }
  }
}

if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
}
if (volumeBtn) {
  volumeBtn.addEventListener('click', toggleMute);
}

// Shuffle & Repeat Buttons
const shuffleBtn = document.getElementById('shuffle-btn');
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    shuffleBtn.classList.toggle('active', state.isShuffle);
  });
}

const repeatBtn = document.getElementById('repeat-btn');
if (repeatBtn) {
  repeatBtn.addEventListener('click', () => {
    if (state.repeatMode === 'all') {
      state.repeatMode = 'one';
      repeatBtn.textContent = '🔂';
      repeatBtn.classList.add('active');
    } else if (state.repeatMode === 'one') {
      state.repeatMode = 'off';
      repeatBtn.textContent = '🔁';
      repeatBtn.classList.remove('active');
    } else {
      state.repeatMode = 'all';
      repeatBtn.textContent = '🔁';
      repeatBtn.classList.add('active');
    }
  });
}

// ============================================================================
// 7. Playlist Drawer Rendering & Management
// ============================================================================

const playlistDrawer = document.getElementById('playlist-drawer');
const playlistToggleBtn = document.getElementById('playlist-toggle-btn');
const closePlaylistBtn = document.getElementById('close-playlist-btn');
const playlistTrackList = document.getElementById('playlist-track-list');
const playlistBadge = document.getElementById('playlist-count-badge');
const queueStatusText = document.getElementById('queue-status-text');

function togglePlaylistDrawer() {
  if (playlistDrawer) {
    playlistDrawer.classList.toggle('open');
  }
}

if (playlistToggleBtn) playlistToggleBtn.addEventListener('click', togglePlaylistDrawer);
if (closePlaylistBtn) closePlaylistBtn.addEventListener('click', togglePlaylistDrawer);

let draggedTrackIndex = null;

function renderPlaylistDrawer() {
  if (playlistBadge) playlistBadge.textContent = state.playlist.length;
  if (queueStatusText) queueStatusText.textContent = `${state.playlist.length} track${state.playlist.length === 1 ? '' : 's'} available`;

  if (!playlistTrackList) return;
  playlistTrackList.innerHTML = '';

  state.playlist.forEach((track, idx) => {
    const isCurrent = idx === state.currentTrackIndex && state.audioSourceType === 'playlist';
    const item = document.createElement('div');
    item.className = `track-item ${isCurrent ? 'active' : ''}`;
    
    // Make Draggable
    item.draggable = true;
    
    item.innerHTML = `
      <div class="track-left">
        <span class="track-number">${idx + 1}</span>
        <div class="mini-equalizer">
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
        </div>
        <div class="track-details">
          <span class="track-title" title="${track.title}">${track.title}</span>
          <span class="track-artist">${track.artist} • ${track.genre || track.language}</span>
        </div>
      </div>
      <div class="track-right">
        <span class="track-duration">${formatTime(track.duration || 0)}</span>
        <button class="track-delete-btn" title="Remove track" data-index="${idx}">🗑️</button>
      </div>
    `;

    // Drag and Drop Listeners
    item.addEventListener('dragstart', (e) => {
      draggedTrackIndex = idx;
      item.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
    });

    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      const allItems = playlistTrackList.querySelectorAll('.track-item');
      allItems.forEach(i => {
        i.style.borderTop = '';
        i.style.borderBottom = '';
      });
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const bounding = item.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      if (e.clientY - offset > 0) {
        item.style.borderTop = '';
        item.style.borderBottom = '2px solid var(--accent)';
      } else {
        item.style.borderTop = '2px solid var(--accent)';
        item.style.borderBottom = '';
      }
    });

    item.addEventListener('dragleave', (e) => {
      item.style.borderTop = '';
      item.style.borderBottom = '';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.style.borderTop = '';
      item.style.borderBottom = '';
      
      if (draggedTrackIndex === null || draggedTrackIndex === idx) return;

      const bounding = item.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      let targetIndex = idx;
      if (e.clientY - offset > 0) {
        targetIndex = idx + 1;
      }
      
      const draggedTrack = state.playlist[draggedTrackIndex];
      state.playlist.splice(draggedTrackIndex, 1);
      
      if (draggedTrackIndex < targetIndex) {
        targetIndex--;
      }
      
      state.playlist.splice(targetIndex, 0, draggedTrack);
      
      if (state.currentTrackIndex === draggedTrackIndex) {
        state.currentTrackIndex = targetIndex;
      } else if (state.currentTrackIndex > draggedTrackIndex && state.currentTrackIndex <= targetIndex) {
        state.currentTrackIndex--;
      } else if (state.currentTrackIndex < draggedTrackIndex && state.currentTrackIndex >= targetIndex) {
        state.currentTrackIndex++;
      }
      
      draggedTrackIndex = null;
      renderPlaylistDrawer();
    });

    item.addEventListener('click', (e) => {
      if (e.target.closest('.track-delete-btn')) {
        e.stopPropagation();
        removeTrack(idx);
      } else {
        playTrack(idx);
      }
    });

    playlistTrackList.appendChild(item);
  });
}

function removeTrack(idx) {
  if (idx < 0 || idx >= state.playlist.length) return;
  const removed = state.playlist.splice(idx, 1)[0];
  if (removed.url) {
    URL.revokeObjectURL(removed.url);
  }

  if (state.playlist.length === 0) {
    if (state.audioSourceType === 'playlist') stopAudio();
    state.currentTrackIndex = 0;
  } else if (idx === state.currentTrackIndex) {
    state.currentTrackIndex = Math.min(state.currentTrackIndex, state.playlist.length - 1);
    if (state.audioSourceType === 'playlist') playTrack(state.currentTrackIndex);
  } else if (idx < state.currentTrackIndex) {
    state.currentTrackIndex--;
  }

  renderPlaylistDrawer();
}

const clearDrawerBtn = document.getElementById('drawer-clear-btn');
if (clearDrawerBtn) {
  clearDrawerBtn.addEventListener('click', () => {
    // Memory management: free up object URLs
    state.playlist.forEach(track => {
      if (track.url) URL.revokeObjectURL(track.url);
    });
    
    state.playlist = [];
    state.currentTrackIndex = 0;
    if (state.audioSourceType === 'playlist') {
       stopAudio();
    }
    renderPlaylistDrawer();
  });
}

// ============================================================================
// 8. Robust Multi-File Audio Upload & Drag-and-Drop
// ============================================================================

function extractAudioFileMetadata(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const buffer = e.target.result;
      const view = new DataView(buffer);
      
      let rawName = file.name.replace(/\.[^/.]+$/, "");
      let meta = {
        title: rawName,
        artist: "Uploaded Artist",
        language: "Audio File",
        genre: "Electronic / Pop"
      };

      try {
        // ID3v2 Header Check
        if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
          const id3Version = view.getUint8(3);
          const tagSize = (
            ((view.getUint8(6) & 0x7F) << 21) |
            ((view.getUint8(7) & 0x7F) << 14) |
            ((view.getUint8(8) & 0x7F) << 7) |
            (view.getUint8(9) & 0x7F)
          );

          let offset = 10;
          const maxOffset = Math.min(buffer.byteLength, 10 + tagSize);

          while (offset < maxOffset - 10) {
            let frameID = "";
            for (let i = 0; i < 4; i++) {
              frameID += String.fromCharCode(view.getUint8(offset + i));
            }

            if (!/^[A-Z0-9]{4}$/.test(frameID)) break;

            let frameSize = 0;
            if (id3Version === 4) {
              frameSize = (
                ((view.getUint8(offset + 4) & 0x7F) << 21) |
                ((view.getUint8(offset + 5) & 0x7F) << 14) |
                ((view.getUint8(offset + 6) & 0x7F) << 7) |
                (view.getUint8(offset + 7) & 0x7F)
              );
            } else {
              frameSize = view.getUint32(offset + 4);
            }

            if (frameSize <= 0 || offset + 10 + frameSize > maxOffset) break;

            const frameData = new Uint8Array(buffer, offset + 10, frameSize);
            const encoding = frameData[0];
            let text = "";

            if (encoding === 1 || encoding === 2) {
              const u16 = new Uint16Array(buffer, offset + 11, Math.floor((frameSize - 1) / 2));
              text = String.fromCharCode.apply(null, Array.from(u16)).replace(/\0/g, '');
            } else {
              const bytes = frameData.slice(1);
              text = new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '');
            }

            text = text.trim();
            if (text.length > 0) {
              if (frameID === 'TIT2') meta.title = text;
              else if (frameID === 'TPE1' || frameID === 'TPE2') meta.artist = text;
              else if (frameID === 'TLAN') meta.language = text.toUpperCase();
              else if (frameID === 'TCON') meta.genre = text;
            }

            offset += 10 + frameSize;
          }
        }
      } catch (err) {
        console.warn("ID3 parse note:", err);
      }

      // Smart Filename Heuristic
      if (meta.artist === "Uploaded Artist" && rawName.includes("-")) {
        const parts = rawName.split("-").map(p => p.trim());
        if (parts.length >= 2) {
          meta.artist = parts[0];
          meta.title = parts.slice(1).join(" - ");
        }
      }

      resolve(meta);
    };

    reader.readAsArrayBuffer(file.slice(0, 131072)); // Read initial 128KB for ID3 tags
  });
}

async function handleFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  initAudio();

  const startIndex = state.playlist.length;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) {
      continue;
    }

    const meta = await extractAudioFileMetadata(file);
    const url = URL.createObjectURL(file);

    // Create temporary element to measure duration
    const tempAudio = new Audio(url);
    const duration = await new Promise(res => {
      tempAudio.addEventListener('loadedmetadata', () => res(tempAudio.duration));
      tempAudio.addEventListener('error', () => res(200));
      setTimeout(() => res(200), 1000);
    });

    state.playlist.push({
      id: 'upload_' + Date.now() + '_' + i,
      title: meta.title,
      artist: meta.artist,
      language: meta.language,
      genre: meta.genre,
      duration: duration || 200,
      type: 'file',
      file: file,
      url: url
    });
  }

  renderPlaylistDrawer();

  // Play the newly added track immediately
  if (state.playlist.length > startIndex) {
    playTrack(startIndex);
  }
}

// Upload Buttons
const uploadBtn = document.getElementById('upload-btn');
const drawerAddBtn = document.getElementById('drawer-add-btn');
const fileInput = document.getElementById('file-input');

if (uploadBtn) {
  uploadBtn.addEventListener('click', () => {
    if (fileInput) {
      fileInput.value = ''; // Reset input to allow selecting same file again
      fileInput.click();
    }
  });
}

if (drawerAddBtn) {
  drawerAddBtn.addEventListener('click', () => {
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  });
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
}

// Audio Source Dropdown
const audioSourceSelect = document.getElementById('audio-source');
if (audioSourceSelect) {
  audioSourceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'synth') {
      state.audioSourceType = 'synth';
      if (state.isPlaying) {
        startSynthEngine(state.selectedPreset);
      }
    } else if (val === 'playlist') {
      let targetIdx = state.currentTrackIndex;
      if (!state.playlist[targetIdx] || state.playlist[targetIdx].type !== 'file') {
        targetIdx = state.playlist.findIndex(t => t.type === 'file');
      }
      if (targetIdx !== -1) {
        state.audioSourceType = 'playlist';
        playTrack(targetIdx);
      } else {
        alert('Please add songs to the playlist first by clicking "Upload Songs" or dragging files onto the screen.');
        audioSourceSelect.value = state.audioSourceType;
      }
    } else if (val === 'mic') {
      startMicInput();
    }
  });
}

// Global Drag & Drop Listeners
const dragOverlay = document.getElementById('drag-drop-overlay');

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
    if (dragOverlay) dragOverlay.classList.add('active');
  }
});

window.addEventListener('dragleave', (e) => {
  if (e.clientX === 0 && e.clientY === 0 && dragOverlay) {
    dragOverlay.classList.remove('active');
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (dragOverlay) dragOverlay.classList.remove('active');
  if (e.dataTransfer && e.dataTransfer.files) {
    handleFiles(e.dataTransfer.files);
  }
});

// ============================================================================
// 9. Attach Transport & Media Button Events
// ============================================================================

const playToggleBtn = document.getElementById('play-toggle');
if (playToggleBtn) playToggleBtn.addEventListener('click', togglePlayPause);

const prevBtn = document.getElementById('prev-btn');
if (prevBtn) prevBtn.addEventListener('click', prevTrack);

const nextBtn = document.getElementById('next-btn');
if (nextBtn) nextBtn.addEventListener('click', nextTrack);

const seekBackBtn = document.getElementById('seek-back-btn');
if (seekBackBtn) seekBackBtn.addEventListener('click', () => seekRelative(-10));

const seekForwardBtn = document.getElementById('seek-forward-btn');
if (seekForwardBtn) seekForwardBtn.addEventListener('click', () => seekRelative(10));

const synthPresetSelect = document.getElementById('synth-preset');
if (synthPresetSelect) {
  synthPresetSelect.addEventListener('change', (e) => {
    state.selectedPreset = e.target.value;
    if (state.audioSourceType === 'synth' && state.isPlaying) {
      startSynthEngine(state.selectedPreset);
    }
  });
}

const geometryModeSelect = document.getElementById('geometry-mode');
if (geometryModeSelect) {
  geometryModeSelect.addEventListener('change', (e) => {
    state.currentGeometryMode = e.target.value;
  });
}

// Keyboard Shortcuts (Space: Play/Pause, Arrow Left/Right: Seek ±10s, Arrow Up/Down: Volume)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    seekRelative(10);
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    seekRelative(-10);
  }
});

function startMicInput() {
  initAudio();
  state.audioSourceType = 'mic';
  if (state.synthTimer) clearInterval(state.synthTimer);
  if (state.masterAudioElement) state.masterAudioElement.pause();

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      const micSource = state.audioCtx.createMediaStreamSource(stream);
      micSource.connect(state.analyser);
      state.isPlaying = true;
      updatePlayButtonUI(true);
    })
    .catch(err => {
      alert('Microphone access note: ' + err.message);
    });
}

// ============================================================================
// 11. AI Theme Modal Generator & Video Recording
// ============================================================================

const vibeModal = document.getElementById('vibe-modal');
const aiThemeBtn = document.getElementById('ai-theme-btn');
const closeModalBtn = document.getElementById('close-modal');
const generateThemeBtn = document.getElementById('generate-theme-btn');
const moodInput = document.getElementById('mood-input');

if (aiThemeBtn) {
  aiThemeBtn.addEventListener('click', () => {
    if (vibeModal) vibeModal.classList.add('open');
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    if (vibeModal) vibeModal.classList.remove('open');
  });
}

if (generateThemeBtn) {
  generateThemeBtn.addEventListener('click', async () => {
    const promptText = moodInput ? moodInput.value.trim() : "Cyberpunk Neon Overdrive";
    generateThemeBtn.textContent = "✨ Generating AI Vibe...";
    generateThemeBtn.disabled = true;

    try {
      const requestPayload = { genre_or_mood: promptText, song_title: state.playlist[state.currentTrackIndex]?.title || "AuraWave Track" };
      let data;
      
      if (window.electronAPI) {
        data = await window.electronAPI.generateVibeTheme(requestPayload);
      } else {
        throw new Error("Electron API not available (running outside Electron)");
      }

      applyAITheme(data);
      if (vibeModal) vibeModal.classList.remove('open');
    } catch (err) {
      console.warn("AI theme fetch error, applying local theme:", err);
      applyAITheme({
        theme_name: `Neon ${promptText}`,
        primary_color: '#06b6d4',
        secondary_color: '#ec4899',
        particle_speed: 1.5,
        wave_intensity: 2.0,
        viral_tagline: "Feel the Music in 3D",
        poetic_vibe: "Dynamic frequencies reshape the virtual horizon in real time."
      });
      if (vibeModal) vibeModal.classList.remove('open');
    } finally {
      generateThemeBtn.textContent = "Generate Vibe & Theme";
      generateThemeBtn.disabled = false;
    }
  });
}

function applyAITheme(theme) {
  const vibeTag = document.getElementById('vibe-tag');
  const viralTagline = document.getElementById('viral-tagline');
  const vibeDesc = document.getElementById('vibe-description');

  if (vibeTag && theme.theme_name) vibeTag.textContent = theme.theme_name;
  if (viralTagline && theme.viral_tagline) viralTagline.textContent = theme.viral_tagline;
  if (vibeDesc && theme.poetic_vibe) vibeDesc.textContent = theme.poetic_vibe;

  if (theme.particle_speed) state.themeSpeed = theme.particle_speed;
  if (theme.wave_intensity) state.themeWaveIntensity = theme.wave_intensity;

  if (theme.primary_color && theme.secondary_color) {
    const c1 = new THREE.Color(theme.primary_color);
    const c2 = new THREE.Color(theme.secondary_color);

    const colArr = geometry.attributes.color.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const ratio = (i % GRID_SIZE) / GRID_SIZE;
      const blended = c1.clone().lerp(c2, ratio);
      colArr[i3] = blended.r;
      colArr[i3 + 1] = blended.g;
      colArr[i3 + 2] = blended.b;
    }
    geometry.attributes.color.needsUpdate = true;
    pointLight1.color.set(theme.primary_color);
    pointLight2.color.set(theme.secondary_color);
  }
}

// Video Recording Module
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

const recordBtn = document.getElementById('record-btn');
const recordText = document.getElementById('record-text');

if (recordBtn) {
  recordBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });
}

function startRecording() {
  initAudio();
  recordedChunks = [];
  const stream = renderer.domElement.captureStream(60);

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AuraWave_Visualizer_${Date.now()}.webm`;
    a.click();
    if (recordText) recordText.textContent = "Record Clip";
    if (recordBtn) recordBtn.classList.remove('primary');
  };

  mediaRecorder.start();
  isRecording = true;
  if (recordText) recordText.textContent = "Stop Recording (Rec 🔴)";
  if (recordBtn) recordBtn.classList.add('primary');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    isRecording = false;
  }
}

// Attach to window for global access between modules
window.formatTime = formatTime;
window.updatePlayButtonUI = updatePlayButtonUI;
window.showTrackDetails = showTrackDetails;
window.playTrack = playTrack;
window.togglePlayPause = togglePlayPause;
window.nextTrack = nextTrack;
window.prevTrack = prevTrack;
window.seekRelative = seekRelative;
window.handleTrackEnded = handleTrackEnded;
window.updateTimeline = updateTimeline;
window.setVolume = setVolume;
window.toggleMute = toggleMute;
window.updateVolumeUI = updateVolumeUI;
window.togglePlaylistDrawer = togglePlaylistDrawer;
window.renderPlaylistDrawer = renderPlaylistDrawer;
window.removeTrack = removeTrack;
window.extractAudioFileMetadata = extractAudioFileMetadata;
window.handleFiles = handleFiles;
window.startMicInput = startMicInput;
window.applyAITheme = applyAITheme;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
