/**
 * Three.js 3D Audio-Reactive Visualizer & Music Player Engine (AuraWave 3D)
 * Features:
 * - Full Media Transport (Play/Pause, Next/Prev, Seek ±10s, Timeline Scrubber, Volume)
 * - Glassmorphism Slide-out Playlist & Queue with Live Mini Equalizer
 * - Multi-File Audio Upload, ID3 Tag Extraction, & Global Drag-and-Drop
 * - Procedural Synth Presets & Real-Time Audio Frequency FFT Analyser
 * - 3D Particle Geometries (Dynamic Wave Grid, Morphing Sphere, Hyperspace Vortex)
 * - High-Quality MP4 Video Recording & AI Theme Generator via Gemini API
 */

// ============================================================================
// 1. App State & Globals
// ============================================================================

let audioCtx = null;
let analyser = null;
let dataArray = null;
let masterAudioElement = null;
let mediaSourceNode = null;

let isPlaying = false;
let synthTimer = null;
let synthTimeElapsed = 0;
let audioSourceType = 'synth'; // 'synth', 'playlist', 'mic'
let selectedPreset = 'cyberpunk';
let currentGeometryMode = 'wave';

let isShuffle = false;
let repeatMode = 'all'; // 'all', 'one', 'off'
let currentVolume = 0.85;
let isMuted = false;
let isDraggingScrubber = false;

// Playlist State
let playlist = [
  {
    id: 'preset_cyberpunk',
    title: 'Cyberpunk Synthwave',
    artist: 'AuraWave AI Synth',
    language: 'Procedural 120 BPM',
    genre: 'Synthwave',
    duration: 180,
    type: 'synth',
    preset: 'cyberpunk'
  },
  {
    id: 'preset_lofi',
    title: 'Lo-Fi Sunset Chill',
    artist: 'AuraWave AI Synth',
    language: 'Procedural 85 BPM',
    genre: 'Lo-Fi Chill',
    duration: 210,
    type: 'synth',
    preset: 'lofi'
  },
  {
    id: 'preset_ambient',
    title: 'Space Ambient & Drones',
    artist: 'AuraWave AI Synth',
    language: 'Generative Soundscape',
    genre: 'Ambient',
    duration: 240,
    type: 'synth',
    preset: 'ambient'
  },
  {
    id: 'preset_electro',
    title: 'Electro House Bounce',
    artist: 'AuraWave AI Synth',
    language: 'Procedural 128 BPM',
    genre: 'Electro House',
    duration: 195,
    type: 'synth',
    preset: 'electro'
  }
];

let currentTrackIndex = 0;

// Camera & Animation State
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
let time = 0;
let themeSpeed = 1.0;
let themeWaveIntensity = 1.5;

let currentEnergy = 0.0;
let targetEnergy = 0.0;

let cameraBaseZ = 45;
let cameraBaseY = 18;

// ============================================================================
// 2. Three.js Scene Setup
// ============================================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07090e, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, cameraBaseY, cameraBaseZ);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x06b6d4, 3, 200);
pointLight1.position.set(40, 50, 40);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xec4899, 3, 200);
pointLight2.position.set(-40, -30, -40);
scene.add(pointLight2);

// ============================================================================
// 3. 3D Particle Geometries
// ============================================================================

const PARTICLE_COUNT = 6400; // 80x80
const GRID_SIZE = 80;
const SPACING = 2.5;

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const wavePositions = new Float32Array(PARTICLE_COUNT * 3);
const spherePositions = new Float32Array(PARTICLE_COUNT * 3);
const sphereLatitudes = new Float32Array(PARTICLE_COUNT);
const tunnelPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

// Generate Wave Grid Layout
let pIdx = 0;
for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    const px = (x - GRID_SIZE / 2) * SPACING;
    const py = 0;
    const pz = (z - GRID_SIZE / 2) * SPACING;

    wavePositions[pIdx] = px;
    wavePositions[pIdx + 1] = py;
    wavePositions[pIdx + 2] = pz;

    positions[pIdx] = px;
    positions[pIdx + 1] = py;
    positions[pIdx + 2] = pz;

    const colorRatio = (x + z) / (GRID_SIZE * 2);
    colors[pIdx] = THREE.MathUtils.lerp(0.02, 0.92, colorRatio);
    colors[pIdx + 1] = THREE.MathUtils.lerp(0.71, 0.28, colorRatio);
    colors[pIdx + 2] = THREE.MathUtils.lerp(0.83, 0.60, colorRatio);

    pIdx += 3;
  }
}

// Generate Aesthetic Harmonic Cyber Sphere Layout
const phi = Math.PI * (3 - Math.sqrt(5));
const sphereBaseRadius = 24.0;
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = phi * i;

  spherePositions[i * 3] = Math.cos(theta) * radiusAtY * sphereBaseRadius;
  spherePositions[i * 3 + 1] = y * sphereBaseRadius;
  spherePositions[i * 3 + 2] = Math.sin(theta) * radiusAtY * sphereBaseRadius;
  sphereLatitudes[i] = y;
}

// Generate Hyperspace Vortex Tunnel Layout
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = (i % 64) * ((Math.PI * 2) / 64);
  const ringIdx = Math.floor(i / 64);
  const radius = 12 + Math.sin(ringIdx * 0.15) * 3;
  const z = (ringIdx - 50) * 4;

  tunnelPositions[i * 3] = Math.cos(angle) * radius;
  tunnelPositions[i * 3 + 1] = Math.sin(angle) * radius;
  tunnelPositions[i * 3 + 2] = z;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Particle Texture
const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext('2d');
const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.3, 'rgba(6,182,212,0.85)');
grad.addColorStop(0.7, 'rgba(236,72,153,0.35)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = grad;
ctx.beginPath();
ctx.arc(32, 32, 32, 0, Math.PI * 2);
ctx.fill();

const particleTexture = new THREE.CanvasTexture(canvas);

const material = new THREE.PointsMaterial({
  size: 1.6,
  map: particleTexture,
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// Aesthetic Ambient Outer Ring
const ringGeo = new THREE.RingGeometry(28, 29, 64);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x06b6d4,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.25,
  wireframe: true
});
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.x = Math.PI / 2;
scene.add(ringMesh);

// Dynamic Viewport & Orientation Adaptor
function handleResponsiveLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;

  camera.aspect = width / height;

  if (isPortrait) {
    camera.fov = 75;
    cameraBaseZ = 65;
    cameraBaseY = 28;
    material.size = 1.3;
  } else {
    camera.fov = 60;
    cameraBaseZ = 45;
    cameraBaseY = 18;
    material.size = 1.6;
  }

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', handleResponsiveLayout);
handleResponsiveLayout();

// ============================================================================
// 4. Audio Engine & Media Routing
// ============================================================================

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  // Initialize master audio element connection
  masterAudioElement = document.getElementById('master-audio');
  if (masterAudioElement) {
    masterAudioElement.volume = isMuted ? 0 : currentVolume;
    try {
      if (!mediaSourceNode) {
        mediaSourceNode = audioCtx.createMediaElementSource(masterAudioElement);
        mediaSourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
    } catch (err) {
      console.warn("MediaElementSource note:", err);
    }

    // Audio Element Event Listeners
    masterAudioElement.addEventListener('timeupdate', updateTimeline);
    masterAudioElement.addEventListener('ended', handleTrackEnded);
    masterAudioElement.addEventListener('play', () => {
      isPlaying = true;
      updatePlayButtonUI(true);
      renderPlaylistDrawer();
    });
    masterAudioElement.addEventListener('pause', () => {
      if (audioSourceType !== 'synth') {
        isPlaying = false;
        updatePlayButtonUI(false);
        renderPlaylistDrawer();
      }
    });
  }
}

// Procedural Multi-Genre Synth Engine
function startSynthEngine(genre) {
  initAudio();
  if (synthTimer) clearInterval(synthTimer);

  const synthPresetSelect = document.getElementById('synth-preset');
  if (synthPresetSelect) synthPresetSelect.value = genre;

  let step = 0;

  if (genre === 'cyberpunk') {
    const bpm = 120;
    const interval = (60 / bpm / 4) * 1000;
    const bassNotes = [55, 55, 65.41, 55, 73.42, 55, 82.41, 65.41];

    synthTimer = setInterval(() => {
      if (!isPlaying || audioSourceType !== 'synth') return;
      synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      const f = bassNotes[step % bassNotes.length];
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      step = (step + 1) % 32;
    }, interval);

  } else if (genre === 'lofi') {
    const bpm = 85;
    const interval = (60 / bpm / 2) * 1000;
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];

    synthTimer = setInterval(() => {
      if (!isPlaying || audioSourceType !== 'synth') return;
      synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = audioCtx.currentTime;
      const chord = chords[Math.floor(step / 4) % chords.length];

      chord.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.5, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12 / chord.length, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (interval / 1000) * 1.8);

        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + (interval / 1000) * 2.0);
      });

      step = (step + 1) % 32;
    }, interval);

  } else if (genre === 'ambient') {
    const interval = 800;
    const scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];

    synthTimer = setInterval(() => {
      if (!isPlaying || audioSourceType !== 'synth') return;
      synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = audioCtx.currentTime;
      const f = scale[Math.floor(Math.random() * scale.length)];

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + Math.sin(now) * 200, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 4.0);
    }, interval);

  } else if (genre === 'electro') {
    const bpm = 128;
    const interval = (60 / bpm / 4) * 1000;
    const notes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];

    synthTimer = setInterval(() => {
      if (!isPlaying || audioSourceType !== 'synth') return;
      synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = audioCtx.currentTime;

      if (step % 4 === 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.15);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }

      if (step % 2 === 1) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const f = notes[(step % notes.length)];
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      step = (step + 1) % 16;
    }, interval);
  }
}

function stopAudio() {
  isPlaying = false;
  if (synthTimer) {
    clearInterval(synthTimer);
    synthTimer = null;
  }
  if (masterAudioElement) {
    masterAudioElement.pause();
  }
  updatePlayButtonUI(false);
  renderPlaylistDrawer();
}

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
  if (index < 0 || index >= playlist.length) return;
  currentTrackIndex = index;
  const track = playlist[currentTrackIndex];

  initAudio();
  showTrackDetails(track);

  const audioSourceSelect = document.getElementById('audio-source');

  if (track.type === 'synth') {
    audioSourceType = 'synth';
    selectedPreset = track.preset;
    if (audioSourceSelect) audioSourceSelect.value = 'synth';
    if (masterAudioElement) masterAudioElement.pause();

    synthTimeElapsed = 0;
    isPlaying = true;
    updatePlayButtonUI(true);
    startSynthEngine(track.preset);

  } else if (track.type === 'file') {
    audioSourceType = 'playlist';
    if (audioSourceSelect) audioSourceSelect.value = 'playlist';
    if (synthTimer) clearInterval(synthTimer);

    if (masterAudioElement) {
      if (masterAudioElement.src !== track.url) {
        masterAudioElement.src = track.url;
      }
      masterAudioElement.play().catch(e => console.log("Play error:", e));
      isPlaying = true;
      updatePlayButtonUI(true);
    }
  }

  renderPlaylistDrawer();
}

function togglePlayPause() {
  initAudio();
  if (isPlaying) {
    stopAudio();
  } else {
    isPlaying = true;
    updatePlayButtonUI(true);
    const track = playlist[currentTrackIndex];
    if (track) {
      playTrack(currentTrackIndex);
    } else {
      playTrack(0);
    }
  }
}

function nextTrack() {
  if (playlist.length === 0) return;
  let nextIdx = currentTrackIndex + 1;
  if (isShuffle && playlist.length > 1) {
    do {
      nextIdx = Math.floor(Math.random() * playlist.length);
    } while (nextIdx === currentTrackIndex);
  } else if (nextIdx >= playlist.length) {
    nextIdx = 0;
  }
  playTrack(nextIdx);
}

function prevTrack() {
  if (playlist.length === 0) return;
  if (audioSourceType === 'playlist' && masterAudioElement && masterAudioElement.currentTime > 3) {
    masterAudioElement.currentTime = 0;
    return;
  }
  let prevIdx = currentTrackIndex - 1;
  if (prevIdx < 0) {
    prevIdx = playlist.length - 1;
  }
  playTrack(prevIdx);
}

function seekRelative(seconds) {
  if (audioSourceType === 'playlist' && masterAudioElement) {
    masterAudioElement.currentTime = Math.max(0, Math.min(masterAudioElement.duration || 0, masterAudioElement.currentTime + seconds));
    updateTimeline();
  } else if (audioSourceType === 'synth') {
    const track = playlist[currentTrackIndex];
    const dur = (track && track.duration) || 180;
    synthTimeElapsed = Math.max(0, Math.min(dur, synthTimeElapsed + seconds));
    updateTimeline();
  }
}

function handleTrackEnded() {
  if (repeatMode === 'one') {
    playTrack(currentTrackIndex);
  } else if (repeatMode === 'all') {
    nextTrack();
  } else {
    if (currentTrackIndex < playlist.length - 1) {
      nextTrack();
    } else {
      stopAudio();
    }
  }
}

function updateTimeline() {
  if (isDraggingScrubber) return;

  const currentLabel = document.getElementById('current-time');
  const totalLabel = document.getElementById('total-duration');
  const progressEl = document.getElementById('timeline-progress');
  const handleEl = document.getElementById('timeline-handle');
  const bufferedEl = document.getElementById('timeline-buffered');

  let cur = 0;
  let dur = 0;

  if (audioSourceType === 'playlist' && masterAudioElement) {
    cur = masterAudioElement.currentTime || 0;
    dur = masterAudioElement.duration || 0;

    if (masterAudioElement.buffered && masterAudioElement.buffered.length > 0) {
      const bufferedEnd = masterAudioElement.buffered.end(masterAudioElement.buffered.length - 1);
      const bufPct = (bufferedEnd / (dur || 1)) * 100;
      if (bufferedEl) bufferedEl.style.width = `${bufPct}%`;
    }
  } else if (audioSourceType === 'synth') {
    const track = playlist[currentTrackIndex];
    dur = (track && track.duration) || 180;
    cur = synthTimeElapsed % dur;
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
  function seekFromEvent(e) {
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;

    if (audioSourceType === 'playlist' && masterAudioElement && masterAudioElement.duration) {
      masterAudioElement.currentTime = ratio * masterAudioElement.duration;
    } else if (audioSourceType === 'synth') {
      const track = playlist[currentTrackIndex];
      const dur = (track && track.duration) || 180;
      synthTimeElapsed = ratio * dur;
    }
    updateTimeline();
  }

  timelineContainer.addEventListener('mousedown', (e) => {
    isDraggingScrubber = true;
    seekFromEvent(e);
    const onMouseMove = (ev) => seekFromEvent(ev);
    const onMouseUp = () => {
      isDraggingScrubber = false;
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
  currentVolume = parseFloat(val);
  isMuted = currentVolume === 0;
  if (masterAudioElement) {
    masterAudioElement.volume = currentVolume;
  }
  updateVolumeUI();
}

function toggleMute() {
  isMuted = !isMuted;
  if (masterAudioElement) {
    masterAudioElement.volume = isMuted ? 0 : currentVolume;
  }
  if (volumeSlider) {
    volumeSlider.value = isMuted ? 0 : currentVolume;
  }
  updateVolumeUI();
}

function updateVolumeUI() {
  if (volumeBtn) {
    if (isMuted || currentVolume === 0) {
      volumeBtn.textContent = '🔇';
    } else if (currentVolume < 0.5) {
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
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
  });
}

const repeatBtn = document.getElementById('repeat-btn');
if (repeatBtn) {
  repeatBtn.addEventListener('click', () => {
    if (repeatMode === 'all') {
      repeatMode = 'one';
      repeatBtn.textContent = '🔂';
      repeatBtn.classList.add('active');
    } else if (repeatMode === 'one') {
      repeatMode = 'off';
      repeatBtn.textContent = '🔁';
      repeatBtn.classList.remove('active');
    } else {
      repeatMode = 'all';
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

function renderPlaylistDrawer() {
  if (playlistBadge) playlistBadge.textContent = playlist.length;
  if (queueStatusText) queueStatusText.textContent = `${playlist.length} track${playlist.length === 1 ? '' : 's'} available`;

  if (!playlistTrackList) return;
  playlistTrackList.innerHTML = '';

  playlist.forEach((track, idx) => {
    const isCurrent = idx === currentTrackIndex;
    const item = document.createElement('div');
    item.className = `track-item ${isCurrent ? 'active' : ''}`;
    
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
        ${track.type === 'file' ? `<button class="track-delete-btn" title="Remove track" data-index="${idx}">🗑️</button>` : ''}
      </div>
    `;

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
  if (idx < 0 || idx >= playlist.length) return;
  const removed = playlist.splice(idx, 1)[0];
  if (removed.url) {
    URL.revokeObjectURL(removed.url);
  }

  if (playlist.length === 0) {
    stopAudio();
    currentTrackIndex = 0;
  } else if (idx === currentTrackIndex) {
    currentTrackIndex = Math.min(currentTrackIndex, playlist.length - 1);
    playTrack(currentTrackIndex);
  } else if (idx < currentTrackIndex) {
    currentTrackIndex--;
  }

  renderPlaylistDrawer();
}

const clearDrawerBtn = document.getElementById('drawer-clear-btn');
if (clearDrawerBtn) {
  clearDrawerBtn.addEventListener('click', () => {
    // Keep synth presets, clear uploaded files
    playlist = playlist.filter(t => t.type === 'synth');
    currentTrackIndex = 0;
    playTrack(0);
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

  const startIndex = playlist.length;

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

    playlist.push({
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
  if (playlist.length > startIndex) {
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
    if (val === 'file') {
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
      audioSourceSelect.value = 'playlist';
    } else if (val === 'synth') {
      audioSourceType = 'synth';
      playTrack(0);
    } else if (val === 'playlist') {
      audioSourceType = 'playlist';
      playTrack(currentTrackIndex);
    } else if (val === 'mic') {
      startMicInput();
    }
  });
}

// Global Drag & Drop Listeners
const dragOverlay = document.getElementById('drag-drop-overlay');

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (dragOverlay) dragOverlay.classList.add('active');
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
    selectedPreset = e.target.value;
    if (audioSourceType === 'synth' && isPlaying) {
      startSynthEngine(selectedPreset);
    }
  });
}

const geometryModeSelect = document.getElementById('geometry-mode');
if (geometryModeSelect) {
  geometryModeSelect.addEventListener('change', (e) => {
    currentGeometryMode = e.target.value;
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
  audioSourceType = 'mic';
  if (synthTimer) clearInterval(synthTimer);
  if (masterAudioElement) masterAudioElement.pause();

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      const micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(analyser);
      isPlaying = true;
      updatePlayButtonUI(true);
    })
    .catch(err => {
      alert('Microphone access note: ' + err.message);
    });
}

// ============================================================================
// 10. Smooth Physics & Three.js Render Loop
// ============================================================================

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX - window.innerWidth / 2) * 0.04;
  mouseY = (e.clientY - window.innerHeight / 2) * 0.04;
});

function animate() {
  requestAnimationFrame(animate);

  let avgFrequency = 0;
  if (analyser && isPlaying && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    avgFrequency = sum / dataArray.length;
    targetEnergy = 0.35 + (avgFrequency / 255) * 0.85;
  } else {
    targetEnergy = 0.0;
    if (dataArray) {
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.floor(dataArray[i] * 0.9);
      }
    }
  }

  currentEnergy += (targetEnergy - currentEnergy) * 0.04;
  time += (0.001 + 0.022 * currentEnergy) * themeSpeed;

  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  if (currentGeometryMode === 'tunnel') {
    camera.position.set(0, 0, cameraBaseZ + 15);
  } else {
    camera.position.x = Math.sin(time * 0.2) * (4 + 12 * currentEnergy) + targetX;
    camera.position.y = cameraBaseY + targetY;
    camera.position.z = cameraBaseZ;
  }
  camera.lookAt(0, 0, 0);

  ringMesh.rotation.z += 0.0005 + 0.0025 * currentEnergy;

  const posAttr = geometry.attributes.position;
  const posArr = posAttr.array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const freqIdx = Math.min(i % 128, (dataArray ? dataArray.length - 1 : 0));
    const audioVal = dataArray ? (dataArray[freqIdx] / 255) : 0;

    if (currentGeometryMode === 'wave') {
      const initX = wavePositions[i3];
      const initZ = wavePositions[i3 + 2];
      const dist = Math.sqrt(initX * initX + initZ * initZ);
      
      const freqBoost = audioVal * 26 * themeWaveIntensity * currentEnergy;
      const waveElevation = (Math.sin(dist * 0.12 - time * 2) * 5 + Math.cos(initX * 0.1 + time) * 3.5) * currentEnergy;

      posArr[i3] = initX;
      posArr[i3 + 1] = waveElevation + freqBoost;
      posArr[i3 + 2] = initZ;

    } else if (currentGeometryMode === 'sphere') {
      const sx = spherePositions[i3];
      const sy = spherePositions[i3 + 1];
      const sz = spherePositions[i3 + 2];
      const lat = sphereLatitudes[i];

      const surfaceRipple = Math.sin(lat * 8 - time * 3) * (audioVal * 4.5 * themeWaveIntensity * currentEnergy);
      const pulseMultiplier = 1.0 + (audioVal * 0.18 * themeWaveIntensity * currentEnergy);

      const rotAngle = time * 0.25;
      const cosA = Math.cos(rotAngle);
      const sinA = Math.sin(rotAngle);

      posArr[i3] = (sx * cosA - sz * sinA) * pulseMultiplier;
      posArr[i3 + 1] = (sy + surfaceRipple) * pulseMultiplier;
      posArr[i3 + 2] = (sx * sinA + sz * cosA) * pulseMultiplier;

    } else if (currentGeometryMode === 'tunnel') {
      const tx = tunnelPositions[i3];
      const ty = tunnelPositions[i3 + 1];
      let tz = tunnelPositions[i3 + 2] + (time * 40) % 400 - 200;

      const tunnelRadiusBoost = 1.0 + audioVal * 0.6 * themeWaveIntensity * currentEnergy;

      posArr[i3] = tx * tunnelRadiusBoost;
      posArr[i3 + 1] = ty * tunnelRadiusBoost;
      posArr[i3 + 2] = tz;
    }
  }

  posAttr.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();

// Initialize Playlist Drawer View
renderPlaylistDrawer();

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
      const res = await fetch('/api/vibe-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre_or_mood: promptText, song_title: playlist[currentTrackIndex]?.title || "AuraWave Track" })
      });

      const data = await res.json();
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

  if (theme.particle_speed) themeSpeed = theme.particle_speed;
  if (theme.wave_intensity) themeWaveIntensity = theme.wave_intensity;

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
