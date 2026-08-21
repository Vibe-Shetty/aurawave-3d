// ============================================================================
// Full-Length Global Music Search & Live Streaming Directory
// ============================================================================

// Curated High-Reliability 24/7 Live Radio Stations
export const CURATED_STATIONS = [
  {
    id: 'synthwave',
    title: 'Cyberpunk Synthwave 24/7',
    artist: 'Nightwave Synth Radio',
    genre: 'Synthwave',
    cover: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://synthwave.stream.laut.fm/synthwave',
    bpm: 124,
    isLive: true
  },
  {
    id: 'lofi',
    title: 'Midnight Lo-Fi Chillhop',
    artist: 'Lofi Study Beats',
    genre: 'Lo-Fi',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://lofi.stream.laut.fm/lofi',
    bpm: 84,
    isLive: true
  },
  {
    id: 'phonk',
    title: 'Tokyo Drift Midnight Phonk & Bass',
    artist: 'Beat Blender Drift Club',
    genre: 'Phonk / Bass',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    bpm: 140,
    isLive: true
  },
  {
    id: 'ambient',
    title: 'Deep Space Cosmic Drone',
    artist: 'SomaFM Space Station',
    genre: 'Cosmic Ambient',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/spacestation-128-mp3',
    bpm: 60,
    isLive: true
  },
  {
    id: 'groove',
    title: 'Electronic Groove & Chill',
    artist: 'SomaFM Groove Salad',
    genre: 'Ambient Downtempo',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    bpm: 110,
    isLive: true
  },
  {
    id: 'cyberpunk',
    title: 'DEF CON Cyberpunk Electronic',
    artist: 'DEF CON Radio',
    genre: 'Cyberpunk',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    bpm: 128,
    isLive: true
  },
  {
    id: 'vaporwave',
    title: 'Neon Vaporwave 24/7',
    artist: 'SomaFM Vaporwaves',
    genre: 'Vaporwave',
    cover: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    bpm: 90,
    isLive: true
  }
];

// ============================================================================
// Direct YouTube & Audio Stream Link Parser
// ============================================================================

export function extractYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export async function resolveUrlMetadata(url) {
  const videoId = extractYouTubeVideoId(url);
  
  if (videoId) {
    let title = 'YouTube Track';
    let author = 'YouTube Music';
    let cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          title = data.title;
          author = data.author_name || author;
          cover = data.thumbnail_url || cover;
        }
      }
    } catch (e) {
      console.warn("YouTube metadata fetch note:", e);
    }

    return {
      id: `yt-${videoId}`,
      videoId: videoId,
      title: title,
      artist: author,
      genre: 'YouTube Music',
      cover: cover,
      streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
      isLive: false,
      isYouTube: true,
      duration: 210,
      durationStr: '3:30'
    };
  }

  return {
    id: `direct-${Date.now()}`,
    title: 'Direct Audio Stream',
    artist: url.replace(/^https?:\/\//, '').split('/')[0],
    genre: 'Web Audio',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    streamUrl: url,
    isLive: true,
    isYouTube: false
  };
}

// ============================================================================
// AI Scene & Natural Language Intent Matcher
// ============================================================================

export function detectSceneIntent(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // 1. Synthwave / Cyberpunk / Night Drive
  if (q.includes('night drive') || q.includes('highway') || q.includes('cyberpunk') || q.includes('neon') || q.includes('80s drive') || q.includes('outrun')) {
    return {
      isScene: true,
      sceneName: '🌆 Late Night Cyber Highway',
      genre: 'Synthwave',
      vibePrompt: 'Synthwave Retrowave 80s Cyberpunk Drive',
      bpmTag: '⚡ 124 BPM • High Velocity',
      mood: { colorA: [0.02, 0.94, 1.0], colorB: [0.95, 0.25, 0.6] },
      speed: 1.6
    };
  }

  // 2. Lo-Fi / Study / Rainy Cafe / Coding
  if (q.includes('study') || q.includes('coding') || q.includes('rain') || q.includes('coffee') || q.includes('cafe') || q.includes('sleep') || q.includes('focus') || q.includes('without lyrics')) {
    return {
      isScene: true,
      sceneName: '☕ Rainy Midnight Study Cafe',
      genre: 'Lo-Fi',
      vibePrompt: 'Lofi Study Beats Chillhop Instrumental',
      bpmTag: '🌊 82 BPM • Deep Focus',
      mood: { colorA: [0.95, 0.6, 0.2], colorB: [0.4, 0.2, 0.8] },
      speed: 0.7
    };
  }

  // 3. Phonk / Gym / Workout / Tokyo Drift
  if (q.includes('gym') || q.includes('workout') || q.includes('drift') || q.includes('rage') || q.includes('phonk') || q.includes('hardcore') || q.includes('bass')) {
    return {
      isScene: true,
      sceneName: '🏎️ Tokyo Midnight Drift & Gym',
      genre: 'Phonk / Bass',
      vibePrompt: 'Tokyo Drift Aggressive Phonk Bass Workout',
      bpmTag: '🔥 144 BPM • Max Adrenaline',
      mood: { colorA: [0.9, 0.1, 0.3], colorB: [0.15, 0.1, 0.35] },
      speed: 2.0
    };
  }

  // 4. Cosmic Ambient / Deep Space / Meditation
  if (q.includes('space') || q.includes('meditation') || q.includes('ambient') || q.includes('drone') || q.includes('relax') || q.includes('universe')) {
    return {
      isScene: true,
      sceneName: '🪐 Deep Orbit Cosmic Drift',
      genre: 'Cosmic Ambient',
      vibePrompt: 'Deep Space Cosmic Drone Ambient Meditation',
      bpmTag: '🌌 60 BPM • Zero Gravity',
      mood: { colorA: [0.1, 0.4, 0.95], colorB: [0.1, 0.85, 0.65] },
      speed: 0.5
    };
  }

  return null;
}

// ============================================================================
// Global Music Search Engine (Direct YouTube Search)
// ============================================================================

export async function searchGlobalMusic(query) {
  if (!query || query.trim().length === 0) {
    return CURATED_STATIONS;
  }

  // 1. If running in Electron Desktop App, use native IPC search
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.searchMusic === 'function') {
    try {
      const results = await window.electronAPI.searchMusic(query.trim());
      if (Array.isArray(results) && results.length > 0) return results;
    } catch (e) {
      console.warn("Electron search IPC note:", e);
    }
  }

  const cleanQuery = encodeURIComponent(query.trim());

  // 2. Query Real-Time YouTube Search (Vite dev server)
  try {
    const res = await fetch(`/api/search?q=${cleanQuery}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("YouTube direct search fetch notice:", err);
  }

  // 3. Fallback to Curated Stations
  const matchingStations = CURATED_STATIONS.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.artist.toLowerCase().includes(query.toLowerCase()) ||
    s.genre.toLowerCase().includes(query.toLowerCase())
  );
  return matchingStations;
}


