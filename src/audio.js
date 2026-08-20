import { state } from './state.js';
// ============================================================================
// 4. Audio Engine & Media Routing
// ============================================================================

function initAudio() {
  if (state.audioCtx) {
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return;
  }

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
      console.warn("MediaElementSource note:", err);
    }

    // Audio Element Event Listeners
    state.masterAudioElement.addEventListener('timeupdate', updateTimeline);
    state.masterAudioElement.addEventListener('ended', handleTrackEnded);
    state.masterAudioElement.addEventListener('play', () => {
      state.isPlaying = true;
      updatePlayButtonUI(true);
      renderPlaylistDrawer();
    });
    state.masterAudioElement.addEventListener('pause', () => {
      if (state.audioSourceType !== 'synth') {
        state.isPlaying = false;
        updatePlayButtonUI(false);
        renderPlaylistDrawer();
      }
    });
  }
}

// Procedural Multi-Genre Synth Engine
function startSynthEngine(genre) {
  initAudio();
  if (state.synthTimer) clearInterval(state.synthTimer);

  const synthPresetSelect = document.getElementById('synth-preset');
  if (synthPresetSelect) synthPresetSelect.value = genre;

  let step = 0;

  if (genre === 'cyberpunk') {
    const bpm = 120;
    const interval = (60 / bpm / 4) * 1000;
    const bassNotes = [55, 55, 65.41, 55, 73.42, 55, 82.41, 65.41];

    state.synthTimer = setInterval(() => {
      if (!state.isPlaying || state.audioSourceType !== 'synth') return;
      state.synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = state.audioCtx.currentTime;
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      const filter = state.audioCtx.createBiquadFilter();

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
      gain.connect(state.analyser);
      gain.connect(state.audioCtx.destination);

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

    state.synthTimer = setInterval(() => {
      if (!state.isPlaying || state.audioSourceType !== 'synth') return;
      state.synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = state.audioCtx.currentTime;
      const chord = chords[Math.floor(step / 4) % chords.length];

      chord.forEach((freq, idx) => {
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.5, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12 / chord.length, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (interval / 1000) * 1.8);

        osc.connect(gain);
        gain.connect(state.analyser);
        gain.connect(state.audioCtx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + (interval / 1000) * 2.0);
      });

      step = (step + 1) % 32;
    }, interval);

  } else if (genre === 'ambient') {
    const interval = 800;
    const scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];

    state.synthTimer = setInterval(() => {
      if (!state.isPlaying || state.audioSourceType !== 'synth') return;
      state.synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = state.audioCtx.currentTime;
      const f = scale[Math.floor(Math.random() * scale.length)];

      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      const filter = state.audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + Math.sin(now) * 200, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(state.analyser);
      gain.connect(state.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 4.0);
    }, interval);

  } else if (genre === 'electro') {
    const bpm = 128;
    const interval = (60 / bpm / 4) * 1000;
    const notes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];

    state.synthTimer = setInterval(() => {
      if (!state.isPlaying || state.audioSourceType !== 'synth') return;
      state.synthTimeElapsed += interval / 1000;
      updateTimeline();

      const now = state.audioCtx.currentTime;

      if (step % 4 === 0) {
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.15);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(state.analyser);
        gain.connect(state.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }

      if (step % 2 === 1) {
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        const f = notes[(step % notes.length)];
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(state.analyser);
        gain.connect(state.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      step = (step + 1) % 16;
    }, interval);
  }
}

function stopAudio() {
  state.isPlaying = false;
  if (state.synthTimer) {
    clearInterval(state.synthTimer);
    state.synthTimer = null;
  }
  if (state.masterAudioElement) {
    state.masterAudioElement.pause();
  }
  updatePlayButtonUI(false);
  renderPlaylistDrawer();
}


// Attach to window for global access between modules
window.initAudio = initAudio;
window.startSynthEngine = startSynthEngine;
window.stopAudio = stopAudio;
