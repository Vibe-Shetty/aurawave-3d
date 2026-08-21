import { CURATED_STATIONS } from './streamDirectory.js';

export const state = {
  // Web Audio Context & Nodes
  audioCtx: null,
  analyser: null,
  dataArray: null,
  masterAudioElement: null,
  mediaSourceNode: null,
  liveMicStream: null,
  liveMicNode: null,

  // Playback State
  isPlaying: false,
  audioSourceType: 'stream', // 'stream' | 'synth' | 'playlist' | 'mic' | 'youtube'
  activeStationId: 'synthwave',
  currentStreamTrack: CURATED_STATIONS[0],
  
  // Track Metadata
  trackMeta: {
    title: CURATED_STATIONS[0].title,
    artist: CURATED_STATIONS[0].artist,
    genre: CURATED_STATIONS[0].genre,
    cover: CURATED_STATIONS[0].cover,
    isLive: true,
    streamUrl: CURATED_STATIONS[0].streamUrl
  },

  // Playlist (Local MP3s & Queue)
  playlist: [],

  // Synth Fallback Engine
  synthTimer: null,
  synthTimeElapsed: 0,
  selectedPreset: 'cyberpunk',
  SYNTH_PRESETS: ['cyberpunk', 'lofi', 'ambient', 'electro'],

  // Visualizer 3D Geometry
  currentGeometryMode: 'wave', // 'wave' | 'sphere' | 'tunnel'
  
  // UI & Overlay State
  spotlightOpen: false,
  zenMode: false,
  isShuffle: false,
  repeatMode: 'all',
  currentVolume: 0.85,
  isMuted: false,
  isDraggingScrubber: false,
  currentTrackIndex: 0,
  
  // Mouse & Particle Motion
  mouseX: 0,
  mouseY: 0,
  targetX: 0,
  targetY: 0,
  time: 0,
  themeSpeed: 1.0,
  themeWaveIntensity: 1.5,
  currentEnergy: 0.0,
  targetEnergy: 0.0,
  cameraBaseZ: 45,
  cameraBaseY: 18,
  
  // 3D Mood Shift on Card Hover & AI Scene Search
  hoverMood: null,
  activeSearchFilter: 'all',
  
  // Recent Searches & Clipboard Link
  recentSearches: loadRecentSearches(),
  clipboardDetectedLink: null
};

// Recent Searches Storage Helpers
function loadRecentSearches() {
  try {
    const raw = localStorage.getItem('aurawave_recent_searches');
    return raw ? JSON.parse(raw) : [
      { id: 'rec-1', title: 'Chinita Girl', artist: 'Lil Vinceyy', query: 'Chinita Girl Lil Vinceyy' },
      { id: 'rec-2', title: 'Starboy', artist: 'The Weeknd', query: 'The Weeknd Starboy' },
      { id: 'rec-3', title: 'Nadaan Parinde', artist: 'A.R. Rahman', query: 'Nadaan Parinde Rockstar' }
    ];
  } catch (e) {
    return [];
  }
}

export function saveRecentSearches() {
  try {
    localStorage.setItem('aurawave_recent_searches', JSON.stringify(state.recentSearches.slice(0, 8)));
  } catch (e) {}
}

export function addRecentSearch(item) {
  if (!item) return;
  const title = item.title || item.query || 'Track';
  const query = item.query || item.title;
  
  // Remove existing duplicate
  state.recentSearches = state.recentSearches.filter(
    r => (r.title || '').toLowerCase() !== title.toLowerCase() && (r.query || '').toLowerCase() !== query.toLowerCase()
  );
  
  // Add to start
  state.recentSearches.unshift({
    id: item.id || `rec-${Date.now()}`,
    title: title,
    artist: item.artist || 'Search',
    query: query,
    genre: item.genre || 'Music'
  });

  // Limit to 8
  state.recentSearches = state.recentSearches.slice(0, 8);
  saveRecentSearches();
}

export function removeRecentSearch(id) {
  state.recentSearches = state.recentSearches.filter(r => r.id !== id);
  saveRecentSearches();
}

export function clearRecentSearches() {
  state.recentSearches = [];
  saveRecentSearches();
}
