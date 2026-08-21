import { state, addRecentSearch, removeRecentSearch, clearRecentSearches } from './state.js';
import { CURATED_STATIONS, searchGlobalMusic, resolveUrlMetadata, detectSceneIntent } from './streamDirectory.js';
import { 
  initAudio, 
  playStream, 
  playUploadedTrack, 
  startSynthEngine, 
  startLiveMic, 
  togglePlayPause, 
  updatePlayButtonUI, 
  updateDockTrackInfo,
  updateTimelineUI 
} from './audio.js';
import { auth } from './auth.js';
import { sync } from './sync.js';

// ============================================================================
// Minimalist UI Controller & Live Global Music Discovery Engine
// ============================================================================

let searchDebounceTimer = null;

export function initUI() {
  setupSpotlightEvents();
  setupDockControls();
  setupShortcuts();
  setupDragAndDrop();
  setupVibeModal();
  setupAuthAndProfileDrawer();
  startWaveformRenderer();
  
  // Initial track info sync
  updateDockTrackInfo();
  renderInitialStations();
}

// ----------------------------------------------------------------------------
// 1. Spotlight Discovery Modal Engine
// ----------------------------------------------------------------------------

function setupSpotlightEvents() {
  const triggerBtn = document.getElementById('spotlight-trigger');
  const modal = document.getElementById('spotlight-modal');
  const closeBtn = document.getElementById('close-spotlight-btn');
  const searchInput = document.getElementById('spotlight-input');

  async function openSpotlight() {
    state.spotlightOpen = true;
    modal.style.display = 'flex';

    // 📋 Feature 3: Smart Clipboard Auto-Detect
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && (clipText.includes('youtube.com/watch') || clipText.includes('youtu.be/') || clipText.includes('.mp3') || clipText.includes('.ogg') || clipText.startsWith('http'))) {
          state.clipboardDetectedLink = clipText.trim();
        }
      }
    } catch (e) {}

    renderInitialStations();

    setTimeout(() => {
      modal.classList.add('visible');
      if (searchInput) searchInput.focus();
    }, 10);
  }

  function closeSpotlight() {
    state.spotlightOpen = false;
    state.hoverMood = null;
    if (searchInput) searchInput.value = '';
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.style.display = 'none';
      renderInitialStations();
    }, 200);
  }

  if (triggerBtn) triggerBtn.addEventListener('click', openSpotlight);
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (searchInput && searchInput.value.trim().length > 0) {
        // Clear text and return to pre-search discovery view
        searchInput.value = '';
        searchInput.focus();
        renderInitialStations();
      } else {
        closeSpotlight();
      }
    });
  }

  // Close on backdrop click (clicking outside the modal)
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSpotlight();
    });
  }

  // Category Filter Pills Handler
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeSearchFilter = pill.dataset.filter;
      
      // Shift 3D particle background mood to this category immediately
      setFilterParticleMood(state.activeSearchFilter);

      const query = searchInput ? searchInput.value.trim() : '';
      if (!query || query.length === 0) {
        renderInitialStations();
      } else {
        executeLiveSearch(query);
      }
    });
  });

  // Real-Time Global Search with 250ms Debounce
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      const resultsList = document.getElementById('spotlight-results-list');
      if (resultsList && query.length > 0) {
        resultsList.innerHTML = `
          <div class="search-loading-state">
            <div class="search-spinner"></div>
            <p>Searching global music catalogue for "<strong>${escapeHtml(query)}</strong>"...</p>
          </div>
        `;
      }

      searchDebounceTimer = setTimeout(async () => {
        await executeLiveSearch(query);
      }, 250);
    });

    searchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        // Check if user entered a direct stream URL or YouTube link
        if (query.startsWith('http://') || query.startsWith('https://')) {
          const meta = await resolveUrlMetadata(query);
          addRecentSearch(meta);
          playStream(meta);
          closeSpotlight();
        } else {
          // Play top search result hero card or first matching song
          const topCard = document.querySelector('.top-result-hero-card') || document.querySelector('.compact-song-row');
          if (topCard) topCard.click();
        }
      }
    });
  }
}

// ----------------------------------------------------------------------------
// 2. Pre-Search Trending View & Spotify-Style 2-Column Search View
// ----------------------------------------------------------------------------

const GENRE_DISCOVERY_MAP = {
  all: {
    title: '🔥 Trending Soundscapes & 24/7 Streams',
    stations: CURATED_STATIONS,
    creatorsTitle: '🎧 Popular Artists & Creators',
    creators: [
      { name: 'LIL VINCEYY', genre: 'Hip-Hop', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', query: 'Lil Vinceyy' },
      { name: 'The Weeknd', genre: 'R&B / Pop', avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80', query: 'The Weeknd' },
      { name: 'Daft Punk', genre: 'Electronic', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80', query: 'Daft Punk' },
      { name: 'Hans Zimmer', genre: 'Cinematic', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80', query: 'Hans Zimmer' },
      { name: 'Lofi Girl', genre: 'Lo-Fi Chill', avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80', query: 'Lofi Girl' },
      { name: 'Nightwave Plaza', genre: 'Synthwave', avatar: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80', query: 'Synthwave' }
    ]
  },
  radio: {
    title: '📻 24/7 Live Web Radio Stations (Zero Ads)',
    stations: CURATED_STATIONS,
    creatorsTitle: '📡 Featured Radio Broadcasters',
    creators: [
      { name: 'SomaFM DEF CON', genre: 'Cyberpunk Radio', avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80', query: 'DEF CON Radio' },
      { name: 'SomaFM Space Station', genre: 'Cosmic Radio', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80', query: 'SomaFM Space' },
      { name: 'Laut.fm Lo-Fi', genre: 'Chillhop Radio', avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80', query: 'Lo-Fi Radio' },
      { name: 'SomaFM Groove Salad', genre: 'Ambient Chill', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80', query: 'Groove Salad' }
    ]
  },
  synthwave: {
    title: '🌆 Cyberpunk, Retrowave & Outrun Soundscapes',
    stations: [
      CURATED_STATIONS[0],
      CURATED_STATIONS[5],
      CURATED_STATIONS[6]
    ],
    creatorsTitle: '⚡ Legendary Synthwave Artists',
    creators: [
      { name: 'Kavinsky', genre: 'Synthwave / French House', avatar: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80', query: 'Kavinsky' },
      { name: 'Carpenter Brut', genre: 'Darksynth / Electro', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', query: 'Carpenter Brut' },
      { name: 'Perturbator', genre: 'Cyberpunk Synth', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80', query: 'Perturbator' },
      { name: 'The Midnight', genre: 'Synthpop / Retrowave', avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80', query: 'The Midnight' },
      { name: 'Gunship', genre: 'Synthwave', avatar: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80', query: 'Gunship' }
    ]
  },
  lofi: {
    title: '☕ Midnight Lo-Fi, Chillhop & Study Beats',
    stations: [
      CURATED_STATIONS[1],
      CURATED_STATIONS[4]
    ],
    creatorsTitle: '🍃 Famous Lo-Fi Creators',
    creators: [
      { name: 'Lofi Girl', genre: 'Lo-Fi Beats', avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80', query: 'Lofi Girl' },
      { name: 'Kupla', genre: 'Chillhop', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80', query: 'Kupla' },
      { name: 'potsu', genre: 'Lo-Fi Jazz', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', query: 'potsu' },
      { name: 'Idealism', genre: 'Chill Lo-Fi', avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80', query: 'Idealism' },
      { name: 'Chillhop Music', genre: 'Study Beats', avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80', query: 'Chillhop Music' }
    ]
  },
  phonk: {
    title: '🏎️ Tokyo Drift Phonk & Heavy Bass',
    stations: [
      CURATED_STATIONS[2]
    ],
    creatorsTitle: '🔥 Top Phonk Producers',
    creators: [
      { name: 'Kordhell', genre: 'Drift Phonk', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', query: 'Kordhell' },
      { name: 'DVRST', genre: 'Phonk / Bass', avatar: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80', query: 'DVRST' },
      { name: 'Hensonn', genre: 'Drift Phonk', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80', query: 'Hensonn' },
      { name: 'Pharmacist', genre: 'Hard Phonk', avatar: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80', query: 'Pharmacist' },
      { name: 'Ghostface Playa', genre: 'Phonk', avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80', query: 'Ghostface Playa' }
    ]
  },
  songs: {
    title: '🎵 Trending Global Hits & Songs',
    stations: [
      { id: 'top-starboy', title: 'Starboy (ft. Daft Punk)', artist: 'The Weeknd', genre: 'Pop / R&B', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80', query: 'The Weeknd Starboy', isLive: false },
      { id: 'top-chinita', title: 'Chinita Girl', artist: 'Lil Vinceyy ft. Guel', genre: 'Hip-Hop', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80', query: 'Chinita Girl Lil Vinceyy', isLive: false },
      { id: 'top-nadaan', title: 'Nadaan Parinde', artist: 'A.R. Rahman | Mohit Chauhan', genre: 'Bollywood / Rock', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', query: 'Nadaan Parinde Rockstar', isLive: false },
      { id: 'top-midnight', title: 'Midnight City', artist: 'M83', genre: 'Synthpop', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80', query: 'M83 Midnight City', isLive: false }
    ],
    creatorsTitle: '🌟 Featured Song Artists',
    creators: [
      { name: 'The Weeknd', genre: 'R&B / Pop', avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80', query: 'The Weeknd' },
      { name: 'Lil Vinceyy', genre: 'Hip-Hop', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', query: 'Lil Vinceyy' },
      { name: 'A.R. Rahman', genre: 'Composer / World', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80', query: 'A.R. Rahman' },
      { name: 'Daft Punk', genre: 'Electronic', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80', query: 'Daft Punk' }
    ]
  }
};

function setFilterParticleMood(filterKey) {
  if (filterKey === 'synthwave') {
    state.hoverMood = { colorA: [0.02, 0.94, 1.0], colorB: [0.95, 0.25, 0.6] };
  } else if (filterKey === 'lofi') {
    state.hoverMood = { colorA: [0.95, 0.6, 0.2], colorB: [0.4, 0.2, 0.8] };
  } else if (filterKey === 'phonk') {
    state.hoverMood = { colorA: [0.9, 0.1, 0.3], colorB: [0.15, 0.1, 0.35] };
  } else if (filterKey === 'radio') {
    state.hoverMood = { colorA: [0.1, 0.4, 0.95], colorB: [0.1, 0.85, 0.65] };
  } else {
    state.hoverMood = null;
  }
}

function renderInitialStations() {
  const container = document.getElementById('spotlight-results-list');
  if (!container) return;

  const currentCategory = GENRE_DISCOVERY_MAP[state.activeSearchFilter] || GENRE_DISCOVERY_MAP.all;

  // 1. Feature 3: Clipboard Detection Banner HTML
  const clipboardHTML = state.clipboardDetectedLink ? `
    <div class="clipboard-detect-banner">
      <div class="clipboard-banner-info">
        <span class="clipboard-icon">📋</span>
        <div class="clipboard-text-block">
          <span class="clipboard-title">Detected Stream Link in Clipboard</span>
          <span class="clipboard-url">${escapeHtml(state.clipboardDetectedLink)}</span>
        </div>
      </div>
      <button class="clipboard-play-btn" id="clipboard-stream-now-btn">▶ Stream Now</button>
    </div>
  ` : '';

  // 2. Feature 1: Recent Searches Quick-Recall Row HTML
  const recentHTML = state.recentSearches && state.recentSearches.length > 0 ? `
    <div class="recent-searches-section">
      <div class="recent-searches-header">
        <span class="recent-label">🕒 Recent Searches</span>
        <button class="recent-clear-btn" id="clear-all-recents-btn">Clear</button>
      </div>
      <div class="recent-pills-row">
        ${state.recentSearches.map(r => `
          <div class="recent-pill" data-recent-query="${escapeHtml(r.query || r.title)}">
            <span class="recent-pill-title">${escapeHtml(r.title)}</span>
            <button class="recent-pill-remove" data-recent-id="${r.id}" title="Remove">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="presearch-section">
      
      ${clipboardHTML}
      ${recentHTML}

      <div>
        <h3 class="results-column-title">${currentCategory.title}</h3>
        <div class="presearch-cards-grid">
          ${currentCategory.stations.map(st => `
            <div class="trending-card" data-station-id="${st.id}" data-genre="${st.genre}" data-query="${st.query || ''}">
              <img src="${st.cover}" alt="Cover" class="trending-thumb" onerror="this.src='https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80'">
              <div class="trending-info">
                <span class="trending-title">${escapeHtml(st.title)}</span>
                <span class="trending-sub">${escapeHtml(st.artist)} • ${escapeHtml(st.genre)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="related-creators-section">
        <h3 class="results-column-title">${currentCategory.creatorsTitle}</h3>
        <div class="creators-carousel-row">
          ${currentCategory.creators.map(cr => `
            <div class="creator-card" data-creator-query="${escapeHtml(cr.query)}" data-genre="${cr.genre}">
              <img src="${cr.avatar}" alt="${escapeHtml(cr.name)}" class="creator-avatar-img">
              <span class="creator-name">${escapeHtml(cr.name)}</span>
              <span class="creator-badge">${escapeHtml(cr.genre)}</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Attach Clipboard Banner Play Listener
  const clipBtn = document.getElementById('clipboard-stream-now-btn');
  if (clipBtn && state.clipboardDetectedLink) {
    clipBtn.addEventListener('click', async () => {
      const meta = await resolveUrlMetadata(state.clipboardDetectedLink);
      addRecentSearch(meta);
      playStream(meta);
      closeSpotlightModal();
    });
  }

  // Attach Recent Searches Click & Remove Listeners
  container.querySelectorAll('.recent-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      if (e.target.classList.contains('recent-pill-remove')) return;
      const query = pill.dataset.recentQuery;
      const input = document.getElementById('spotlight-input');
      if (input) {
        input.value = query;
        executeLiveSearch(query);
      }
    });
  });

  container.querySelectorAll('.recent-pill-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.recentId;
      removeRecentSearch(id);
      renderInitialStations();
    });
  });

  const clearAllBtn = document.getElementById('clear-all-recents-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearRecentSearches();
      renderInitialStations();
    });
  }

  // Attach Trending Station / Curated Card Click Listeners
  container.querySelectorAll('.trending-card').forEach(card => {
    attachHoverMoodListener(card, card.dataset.genre);
    card.addEventListener('click', () => {
      const stationId = card.dataset.stationId;
      const query = card.dataset.query;
      
      if (query) {
        const input = document.getElementById('spotlight-input');
        if (input) input.value = query;
        executeLiveSearch(query);
      } else {
        const station = currentCategory.stations.find(s => s.id === stationId);
        if (station) {
          addRecentSearch(station);
          playStream(station);
          closeSpotlightModal();
        }
      }
    });
  });

  // Attach Popular Creator Click Listeners (Launches Search)
  container.querySelectorAll('.creator-card').forEach(card => {
    attachHoverMoodListener(card, card.dataset.genre);
    card.addEventListener('click', () => {
      const query = card.dataset.creatorQuery;
      const input = document.getElementById('spotlight-input');
      if (input) {
        input.value = query;
        executeLiveSearch(query);
      }
    });
  });
}

async function executeLiveSearch(query) {
  const container = document.getElementById('spotlight-results-list');
  if (!container) return;

  if (!query || query.length === 0) {
    renderInitialStations();
    return;
  }

  // 1. Direct URL Check
  if (query.startsWith('http://') || query.startsWith('https://')) {
    const meta = await resolveUrlMetadata(query);

    container.innerHTML = `
      <div class="top-result-hero-card" data-is-direct="true" data-genre="Direct Stream" style="max-width: 480px; margin: 0 auto;">
        <div class="hero-cover-wrap">
          <img src="${meta.cover}" alt="Cover" class="hero-cover-img" onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'">
          <button class="hero-play-fab" title="Stream Now">▶</button>
        </div>
        <div class="hero-info-block">
          <span class="hero-track-title">${escapeHtml(meta.title)}</span>
          <span class="hero-track-artist">${escapeHtml(meta.artist)}</span>
          <div class="hero-badges-row">
            <span class="hero-type-pill">${meta.isYouTube ? 'YOUTUBE' : 'STREAM'}</span>
            <span class="hero-energy-pill">⚡ DIRECT LINK</span>
          </div>
        </div>
      </div>
    `;

    const directCard = container.querySelector('.top-result-hero-card');
    if (directCard) {
      attachHoverMoodListener(directCard, 'Electronic');
      directCard.addEventListener('click', () => {
        addRecentSearch(meta);
        playStream(meta);
        closeSpotlightModal();
      });
    }
    return;
  }

  // 2. Feature 2: Natural Language / AI Scene Intent Detection
  const sceneIntent = detectSceneIntent(query);
  let searchQueryToUse = query;
  if (sceneIntent) {
    state.hoverMood = sceneIntent.mood;
    searchQueryToUse = sceneIntent.vibePrompt;
  }

  let rawResults = await searchGlobalMusic(searchQueryToUse);

  // Apply active category filter
  let filteredResults = rawResults;
  if (state.activeSearchFilter === 'songs') {
    filteredResults = rawResults.filter(r => !r.isLive);
  } else if (state.activeSearchFilter === 'radio') {
    const matchingRadios = CURATED_STATIONS.filter(s =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.artist.toLowerCase().includes(query.toLowerCase()) ||
      s.genre.toLowerCase().includes(query.toLowerCase())
    );
    filteredResults = matchingRadios.length > 0 ? matchingRadios : rawResults;
  } else if (state.activeSearchFilter === 'synthwave') {
    const matching = rawResults.filter(r => (r.genre || '').toLowerCase().includes('synth') || (r.title || '').toLowerCase().includes('synth') || (r.artist || '').toLowerCase().includes('synth'));
    filteredResults = matching.length > 0 ? matching : rawResults;
  } else if (state.activeSearchFilter === 'lofi') {
    const matching = rawResults.filter(r => (r.genre || '').toLowerCase().includes('lofi') || (r.genre || '').toLowerCase().includes('lo-fi') || (r.title || '').toLowerCase().includes('lofi') || (r.title || '').toLowerCase().includes('chill'));
    filteredResults = matching.length > 0 ? matching : rawResults;
  } else if (state.activeSearchFilter === 'phonk') {
    const matching = rawResults.filter(r => (r.genre || '').toLowerCase().includes('phonk') || (r.title || '').toLowerCase().includes('phonk') || (r.title || '').toLowerCase().includes('drift') || (r.title || '').toLowerCase().includes('bass'));
    filteredResults = matching.length > 0 ? matching : rawResults;
  }

  if (filteredResults.length === 0) {
    filteredResults = rawResults;
  }

  if (!filteredResults || filteredResults.length === 0) {
    container.innerHTML = `
      <div class="empty-search-state">
        <span class="empty-icon">📻</span>
        <p>No tracks found for "<strong>${escapeHtml(query)}</strong>"</p>
        <span class="empty-sub">Tip: Try searching by song title, artist name, scene (e.g. "late night drive"), or paste a YouTube link.</span>
      </div>
    `;
    return;
  }

  renderSpotifySearchResults(container, filteredResults, query, sceneIntent);
}

function renderSpotifySearchResults(container, results, query, sceneIntent) {
  const topResult = results[0];
  const matchingSongs = results.slice(1, 5);
  const relatedResults = results.slice(5, 12);

  const topCover = topResult.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80';
  const topDuration = topResult.durationStr || (topResult.isLive ? 'LIVE' : '3:30');
  
  // Intelligent BPM calculation or assignment
  const bpmTag = sceneIntent ? sceneIntent.bpmTag : getBpmTag(topResult);

  // AI Scene Badge
  const sceneBadgeHTML = sceneIntent ? `
    <div class="ai-scene-badge">
      <span>⚡ AI SCENE MATCH: ${escapeHtml(sceneIntent.sceneName)}</span>
    </div>
  ` : '';

  const isTopPlaying = state.isPlaying && state.trackMeta && (state.trackMeta.title === topResult.title || state.trackMeta.id === topResult.id);

  container.innerHTML = `
    ${sceneBadgeHTML}
    <div class="spotify-search-grid">
      
      <!-- Left Column: Top Result Hero Card -->
      <div class="top-result-col">
        <h3 class="results-column-title">Top result</h3>
        <div class="top-result-hero-card ${isTopPlaying ? 'is-playing' : ''}" data-track-id="${topResult.id}" data-genre="${topResult.genre || 'Electronic'}">
          <div class="hero-cover-wrap">
            <img src="${topCover}" alt="${escapeHtml(topResult.title)}" class="hero-cover-img" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80'">
            <button class="hero-play-fab" title="Play Top Track">▶</button>
          </div>
          <div class="hero-info-block">
            <span class="hero-track-title">${escapeHtml(topResult.title)}</span>
            <span class="hero-track-artist">Song • ${escapeHtml(topResult.artist)}</span>
            <div class="hero-badges-row">
              <span class="hero-type-pill">${topResult.isYouTube ? 'YOUTUBE MUSIC' : (topResult.isLive ? 'LIVE STREAM' : 'FULL SONG')}</span>
              <span class="hero-energy-pill">${bpmTag}</span>
              <span class="hero-energy-pill">⏱ ${topDuration}</span>
            </div>
            <!-- Mini animated wavebars on hover -->
            <div class="mini-eq-bars">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Matching Songs List -->
      <div class="songs-list-col">
        <h3 class="results-column-title">Songs</h3>
        <div class="compact-songs-col">
          ${matchingSongs.map((track) => {
            const cover = track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80';
            const dur = track.durationStr || (track.isLive ? 'LIVE' : '3:30');
            const rowBpm = getBpmTag(track);
            const isRowPlaying = state.isPlaying && state.trackMeta && (state.trackMeta.title === track.title || state.trackMeta.id === track.id);
            return `
              <div class="compact-song-row ${isRowPlaying ? 'is-playing' : ''}" data-track-id="${track.id}" data-genre="${track.genre || 'Music'}">
                <div class="compact-thumb-wrap">
                  <img src="${cover}" alt="Cover" class="compact-thumb-img" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80'">
                  <div class="compact-thumb-play">▶</div>
                </div>
                <div class="compact-song-info">
                  <span class="compact-song-title">${escapeHtml(track.title)}</span>
                  <div class="compact-sub-row">
                    <span class="compact-song-artist">${escapeHtml(track.artist)}</span>
                    <span class="compact-bpm-tag">${rowBpm}</span>
                  </div>
                </div>
                <div class="compact-meta-right">
                  <div class="mini-eq-bars">
                    <span></span><span></span><span></span><span></span>
                  </div>
                  <span class="compact-song-duration">${dur}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>


    <!-- Bottom Section: Related Creators & Variations -->
    ${relatedResults.length > 0 ? `
      <div class="related-creators-section">
        <h3 class="results-column-title">Related Tracks & Creators</h3>
        <div class="creators-carousel-row">
          ${relatedResults.map(r => `
            <div class="creator-card" data-track-id="${r.id}" data-genre="${r.genre || 'Music'}">
              <img src="${r.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'}" alt="${escapeHtml(r.artist)}" class="creator-avatar-img">
              <span class="creator-name">${escapeHtml(r.artist)}</span>
              <span class="creator-badge">${escapeHtml(r.durationStr || 'Song')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Attach Click & 3D Particle Mood Listeners
  attachAllTrackListeners(container, results);
}

function getBpmTag(track) {
  const g = (track.genre || track.title || '').toLowerCase();
  if (g.includes('phonk') || g.includes('drift')) return '🔥 140 BPM';
  if (g.includes('synth') || g.includes('cyber') || g.includes('retro')) return '⚡ 124 BPM';
  if (g.includes('lofi') || g.includes('lo-fi') || g.includes('chill')) return '🌊 84 BPM';
  if (g.includes('ambient') || g.includes('space') || g.includes('drone')) return '🪐 60 BPM';
  return '⚡ 120 BPM';
}

function attachAllTrackListeners(container, tracksList) {
  // Top Result Card
  const heroCard = container.querySelector('.top-result-hero-card');
  if (heroCard) {
    attachHoverMoodListener(heroCard, heroCard.dataset.genre);
    heroCard.addEventListener('click', () => {
      const trackId = heroCard.dataset.trackId;
      const track = tracksList.find(t => t.id === trackId);
      if (track) {
        addRecentSearch(track);
        playStream(track);
        closeSpotlightModal();
      }
    });
  }

  // Compact Song Rows
  container.querySelectorAll('.compact-song-row').forEach(row => {
    attachHoverMoodListener(row, row.dataset.genre);
    row.addEventListener('click', () => {
      const trackId = row.dataset.trackId;
      const track = tracksList.find(t => t.id === trackId);
      if (track) {
        addRecentSearch(track);
        playStream(track);
        closeSpotlightModal();
      }
    });
  });

  // Related Creators / Variation Cards
  container.querySelectorAll('.related-creators-section .creator-card').forEach(card => {
    attachHoverMoodListener(card, card.dataset.genre);
    card.addEventListener('click', () => {
      const trackId = card.dataset.trackId;
      const track = tracksList.find(t => t.id === trackId);
      if (track) {
        addRecentSearch(track);
        playStream(track);
        closeSpotlightModal();
      }
    });
  });
}

function attachHoverMoodListener(element, genre) {
  const g = (genre || '').toLowerCase();
  let mood = { colorA: [0.0, 0.94, 0.9], colorB: [0.7, 0.1, 0.9] }; // Cyan/Purple

  if (g.includes('synth') || g.includes('cyber')) {
    mood = { colorA: [0.02, 0.94, 1.0], colorB: [0.95, 0.25, 0.6] }; // Neon Cyan & Magenta
  } else if (g.includes('lofi') || g.includes('lo-fi') || g.includes('chill')) {
    mood = { colorA: [0.95, 0.6, 0.2], colorB: [0.4, 0.2, 0.8] }; // Sunset Gold & Violet
  } else if (g.includes('phonk') || g.includes('drift') || g.includes('bass')) {
    mood = { colorA: [0.9, 0.1, 0.3], colorB: [0.15, 0.1, 0.35] }; // Crimson & Night Shadow
  } else if (g.includes('ambient') || g.includes('space') || g.includes('drone')) {
    mood = { colorA: [0.1, 0.4, 0.95], colorB: [0.1, 0.85, 0.65] }; // Deep Blue & Mint
  }

  element.addEventListener('mouseenter', () => {
    state.hoverMood = mood;
  });

  element.addEventListener('mouseleave', () => {
    state.hoverMood = null;
  });
}

function closeSpotlightModal() {
  state.spotlightOpen = false;
  state.hoverMood = null;
  const modal = document.getElementById('spotlight-modal');
  if (modal) {
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// ----------------------------------------------------------------------------
// 3. Refined Bottom Player Dock Controls
// ----------------------------------------------------------------------------

function setupDockControls() {
  const playBtn = document.getElementById('play-toggle');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const seekBackBtn = document.getElementById('seek-back-btn');
  const seekForwardBtn = document.getElementById('seek-forward-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeBtn = document.getElementById('volume-btn');
  const sourceSelect = document.getElementById('audio-source');
  const geometrySelect = document.getElementById('geometry-mode');
  const zenBtn = document.getElementById('zen-mode-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  if (playBtn) playBtn.addEventListener('click', togglePlayPause);

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.audioSourceType === 'youtube') {
        state.youtubeCurrentTime = 0;
        updateTimelineUI();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.seekYouTube === 'function') {
          window.electronAPI.seekYouTube(0).catch(() => {});
        }
      } else if (state.audioSourceType === 'playlist' && Array.isArray(state.playlist) && state.playlist.length > 0) {
        const nextIdx = state.currentTrackIndex > 0 ? state.currentTrackIndex - 1 : state.playlist.length - 1;
        playUploadedTrack(nextIdx);
      } else if (state.masterAudioElement) {
        state.masterAudioElement.currentTime = 0;
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.audioSourceType === 'playlist' && Array.isArray(state.playlist) && state.playlist.length > 0) {
        const nextIdx = (state.currentTrackIndex + 1) % state.playlist.length;
        playUploadedTrack(nextIdx);
      }
    });
  }

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', () => {
      if (state.audioSourceType === 'youtube') {
        const newTime = Math.max(0, (state.youtubeCurrentTime || 0) - 10);
        state.youtubeCurrentTime = newTime;
        updateTimelineUI();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.seekYouTube === 'function') {
          window.electronAPI.seekYouTube(newTime).catch(() => {});
        }
      } else if (state.masterAudioElement) {
        state.masterAudioElement.currentTime = Math.max(0, state.masterAudioElement.currentTime - 10);
      }
    });
  }

  if (seekForwardBtn) {
    seekForwardBtn.addEventListener('click', () => {
      if (state.audioSourceType === 'youtube') {
        const duration = state.youtubeDuration || state.trackMeta?.duration || 210;
        const newTime = Math.min(duration, (state.youtubeCurrentTime || 0) + 10);
        state.youtubeCurrentTime = newTime;
        updateTimelineUI();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.seekYouTube === 'function') {
          window.electronAPI.seekYouTube(newTime).catch(() => {});
        }
      } else if (state.masterAudioElement) {
        state.masterAudioElement.currentTime += 10;
      }
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.currentVolume = val;
      state.isMuted = val === 0;
      if (state.masterAudioElement) state.masterAudioElement.volume = val;
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setYouTubeVolume === 'function') {
        window.electronAPI.setYouTubeVolume(state.isMuted ? 0 : val);
      }
      if (volumeBtn) volumeBtn.innerHTML = val === 0 ? '🔇' : (val < 0.5 ? '🔉' : '🔊');
    });
  }

  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      state.isMuted = !state.isMuted;
      const targetVol = state.isMuted ? 0 : state.currentVolume;
      if (state.masterAudioElement) state.masterAudioElement.volume = targetVol;
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setYouTubeVolume === 'function') {
        window.electronAPI.setYouTubeVolume(targetVol);
      }
      volumeBtn.innerHTML = state.isMuted ? '🔇' : (state.currentVolume < 0.5 ? '🔉' : '🔊');
      if (volumeSlider) volumeSlider.value = targetVol;
    });
  }

  if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
      const src = e.target.value;
      if (src === 'stream') {
        playStream(CURATED_STATIONS[0]);
      } else if (src === 'synth') {
        startSynthEngine(state.selectedPreset || 'cyberpunk');
      } else if (src === 'mic') {
        startLiveMic();
      } else if (src === 'playlist') {
        if (Array.isArray(state.playlist) && state.playlist.length > 0) {
          playUploadedTrack(0);
        } else {
          triggerLocalFilePicker();
        }
      }
    });
  }

  if (geometrySelect) {
    geometrySelect.addEventListener('change', (e) => {
      state.currentGeometryMode = e.target.value;
    });
  }

  if (zenBtn) {
    zenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleZenMode();
    });
  }
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Timeline Click / Scrubbing
  const timeline = document.getElementById('timeline-container');
  if (timeline) {
    timeline.addEventListener('click', (e) => {
      const rect = timeline.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      if (state.audioSourceType === 'youtube') {
        const duration = state.youtubeDuration || state.trackMeta?.duration || 210;
        const seekSeconds = duration * clickRatio;
        state.youtubeCurrentTime = seekSeconds;
        updateTimelineUI();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.seekYouTube === 'function') {
          window.electronAPI.seekYouTube(seekSeconds).catch(() => {});
        }
      } else if (state.masterAudioElement && state.masterAudioElement.duration) {
        state.masterAudioElement.currentTime = state.masterAudioElement.duration * clickRatio;
      }
    });
  }
}

// ----------------------------------------------------------------------------
// 4. Live Audio-Reactive Waveform Scrubber Canvas
// ----------------------------------------------------------------------------

function startWaveformRenderer() {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function renderWaveform() {
    requestAnimationFrame(renderWaveform);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barCount = 48;
    const barWidth = 4;
    const gap = (canvas.width - barCount * barWidth) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      let val = 0.15;
      if (state.isPlaying && state.dataArray) {
        const freqIdx = Math.floor((i / barCount) * (state.dataArray.length / 2));
        val = state.dataArray[freqIdx] / 255;
      }

      const barHeight = Math.max(3, val * canvas.height * 0.85);
      const x = i * (barWidth + gap);
      const y = (canvas.height - barHeight) / 2;

      const r = Math.floor(0 + val * 180);
      const g = Math.floor(240 - val * 60);
      const b = Math.floor(220 + val * 35);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + val * 0.5})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }

  renderWaveform();
}

// ----------------------------------------------------------------------------
// 5. Keyboard Shortcuts & Zen Mode
// ----------------------------------------------------------------------------

function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Open Spotlight on Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.getElementById('spotlight-modal');
      const searchInput = document.getElementById('spotlight-input');
      if (modal && modal.style.display !== 'flex') {
        state.spotlightOpen = true;
        modal.style.display = 'flex';
        setTimeout(() => {
          modal.classList.add('visible');
          if (searchInput) searchInput.focus();
        }, 10);
      } else {
        closeSpotlightModal();
      }
      return;
    }

    // Close Spotlight on Escape
    if (e.key === 'Escape') {
      closeSpotlightModal();
      return;
    }

    // Escape key handling
    if (e.key === 'Escape') {
      if (state.zenMode) {
        e.preventDefault();
        toggleZenMode();
        return;
      }
      if (state.spotlightOpen) {
        const modal = document.getElementById('spotlight-modal');
        if (modal) {
          state.spotlightOpen = false;
          modal.classList.remove('visible');
          setTimeout(() => modal.style.display = 'none', 200);
        }
        return;
      }
    }

    // Ignore other shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      toggleZenMode();
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen();
    } else if (e.key.toLowerCase() === 'm') {
      const volumeBtn = document.getElementById('volume-btn');
      if (volumeBtn) volumeBtn.click();
    }
  });

  // Click on background WebGL canvas during Zen Mode to exit
  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    canvasContainer.addEventListener('click', () => {
      if (state.zenMode) {
        toggleZenMode();
      }
    });
  }
}


// ----------------------------------------------------------------------------
// Zen Mode Controller
// ----------------------------------------------------------------------------

export function toggleZenMode(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  state.zenMode = !state.zenMode;
  if (window.sendRemoteLog) window.sendRemoteLog('EXECUTED_toggleZenMode', { zenMode: state.zenMode });
  const hudRoot = document.getElementById('hud-root');
  const exitPill = document.getElementById('zen-exit-pill');

  if (hudRoot) {
    if (state.zenMode) {
      hudRoot.classList.add('zen-active');
      if (exitPill) {
        exitPill.style.display = 'flex';
        exitPill.style.opacity = '1';
      }
    } else {
      hudRoot.classList.remove('zen-active');
      if (exitPill) exitPill.style.display = 'none';
    }
  }
}
window.toggleZenMode = toggleZenMode;
window.__toggleZenMode = toggleZenMode;

export function toggleFullscreen(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.warn);
  } else {
    document.exitFullscreen().catch(console.warn);
  }
}
window.toggleFullscreen = toggleFullscreen;

window.__toggleFullscreen = toggleFullscreen;


// ----------------------------------------------------------------------------
// 6. Local File Drag & Drop
// ----------------------------------------------------------------------------

export async function triggerLocalFilePicker() {
  initAudio();
  if (!Array.isArray(state.playlist)) state.playlist = [];

  // 1. Native Electron Dialog
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.selectAudioFiles === 'function') {
    try {
      const files = await window.electronAPI.selectAudioFiles();
      if (Array.isArray(files) && files.length > 0) {
        const startIndex = state.playlist.length;
        files.forEach(f => {
          const audioUrl = f.streamUrl || f.dataUrl;
          state.playlist.push({
            id: `local-${Date.now()}-${Math.random()}`,
            title: f.title || f.name,
            artist: f.artist || 'Local Audio Track',
            genre: f.genre || 'Local File',
            cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
            streamUrl: audioUrl,
            url: audioUrl,
            isLive: false
          });
        });
        playUploadedTrack(startIndex);
        const audioSourceSelect = document.getElementById('audio-source');
        if (audioSourceSelect) audioSourceSelect.value = 'playlist';
        return;
      }
    } catch (err) {
      console.warn("Native file picker notice:", err);
    }
  }

  // 2. Fallback DOM file input
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.value = '';
    setTimeout(() => {
      fileInput.click();
    }, 50);
  }
}

function setupDragAndDrop() {
  const dropOverlay = document.getElementById('drag-drop-overlay');
  const fileInput = document.getElementById('file-input');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'flex';
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null && dropOverlay) {
      dropOverlay.style.display = 'none';
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'none';
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
    if (files.length > 0) handleUploadedFiles(files);
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) handleUploadedFiles(files);
    });
  }
}


function handleUploadedFiles(files) {
  initAudio();
  if (!Array.isArray(state.playlist)) state.playlist = [];
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    state.playlist.push({
      id: `local-${Date.now()}-${Math.random()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Local File',
      genre: 'Local Audio',
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
      url: url,
      isLive: false
    });
  });

  // Play first uploaded file immediately
  playUploadedTrack(state.playlist.length - files.length);
  const audioSourceSelect = document.getElementById('audio-source');
  if (audioSourceSelect) audioSourceSelect.value = 'playlist';
}

// ----------------------------------------------------------------------------
// 7. AI Vibe Atmosphere & Music Synthesizer
// ----------------------------------------------------------------------------

export function openVibeModal(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (window.sendRemoteLog) window.sendRemoteLog('EXECUTED_openVibeModal', {});
  const modal = document.getElementById('vibe-modal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('visible');
    }, 10);
  }
}
window.openVibeModal = openVibeModal;
window.__openVibeModal = openVibeModal;

export function closeVibeModal(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById('vibe-modal');
  if (modal) {
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}
window.closeVibeModal = closeVibeModal;
window.__closeVibeModal = closeVibeModal;




export async function generateAIVibe(specificMood, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const moodInput = document.getElementById('mood-input');
  const mood = specificMood || (moodInput ? moodInput.value.trim() : '') || 'Cyberpunk Neon Highway';
  if (moodInput) moodInput.value = mood;

  const vibeTag = document.getElementById('vibe-tag');
  const viralTagline = document.getElementById('viral-tagline');
  const vibeDescription = document.getElementById('vibe-description');

  // 1. Detect Scene Intent or Derive Colors
  const scene = detectSceneIntent(mood);
  let moodColors = { colorA: [0.0, 0.94, 0.9], colorB: [0.7, 0.1, 0.9] };
  let searchQuery = mood;

  if (scene) {
    moodColors = scene.mood;
    searchQuery = scene.vibePrompt;
  } else if (mood.toLowerCase().includes('sunset') || mood.toLowerCase().includes('lofi') || mood.toLowerCase().includes('chill')) {
    moodColors = { colorA: [0.95, 0.6, 0.2], colorB: [0.4, 0.2, 0.8] };
  } else if (mood.toLowerCase().includes('ambient') || mood.toLowerCase().includes('space')) {
    moodColors = { colorA: [0.1, 0.4, 0.95], colorB: [0.1, 0.85, 0.65] };
  } else if (mood.toLowerCase().includes('phonk') || mood.toLowerCase().includes('drift')) {
    moodColors = { colorA: [0.9, 0.1, 0.3], colorB: [0.15, 0.1, 0.35] };
  }

  // Apply 3D Particle Theme
  state.hoverMood = moodColors;

  // Update Center HUD Display
  if (vibeTag) vibeTag.textContent = `AI VIBE • ${mood.toUpperCase()}`;
  if (viralTagline) viralTagline.textContent = `AuraWave • ${mood}`;
  if (vibeDescription) vibeDescription.textContent = `Atmosphere Synthesized • Live Stream Active`;

  // Close Modal
  closeVibeModal();

  // 2. Immediate audio feedback with curated station
  let immediateStation = CURATED_STATIONS[0];
  if (mood.toLowerCase().includes('sunset') || mood.toLowerCase().includes('lofi') || mood.toLowerCase().includes('chill') || mood.toLowerCase().includes('cafe')) {
    immediateStation = CURATED_STATIONS[1];
  } else if (mood.toLowerCase().includes('phonk') || mood.toLowerCase().includes('drift') || mood.toLowerCase().includes('gym')) {
    immediateStation = CURATED_STATIONS[2];
  } else if (mood.toLowerCase().includes('space') || mood.toLowerCase().includes('orbit') || mood.toLowerCase().includes('ambient')) {
    immediateStation = CURATED_STATIONS[3];
  }
  playStream(immediateStation);

  // 3. Search and stream high-match song
  searchGlobalMusic(searchQuery).then(results => {
    if (results && results.length > 0) {
      const trackToPlay = results[0];
      addRecentSearch(trackToPlay);
      playStream(trackToPlay);
    }
  }).catch(err => {
    console.warn("AI Vibe stream launch notice:", err);
  });
}
window.generateAIVibe = generateAIVibe;
window.__generateAIVibe = generateAIVibe;


function setupVibeModal() {
  const vibeBtn = document.getElementById('ai-vibe-btn');
  if (vibeBtn) {
    vibeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openVibeModal(e);
    });
  }

  const closeBtn = document.getElementById('close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVibeModal(e);
    });
  }

  const modal = document.getElementById('vibe-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeVibeModal(e);
      }
    });
  }

  const modalBox = document.getElementById('vibe-modal-box');
  if (modalBox) {
    modalBox.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  const generateBtn = document.getElementById('generate-theme-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      generateAIVibe(null, e);
    });
  }

  // Quick Vibe Chips
  document.querySelectorAll('.vibe-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const vibe = chip.dataset.vibe;
      generateAIVibe(vibe, e);
    });
  });
}

const zenExitBtn = document.getElementById('zen-exit-pill');
if (zenExitBtn) {
  zenExitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleZenMode(e);
  });
}

// ----------------------------------------------------------------------------
// 6. Consumer Auth, User Profile & Zero-Knowledge Vault UI Engine
// ----------------------------------------------------------------------------

function setupAuthAndProfileDrawer() {
  // Top-nav Pill
  const userProfileBtn = document.getElementById('user-profile-btn');
  const userAvatarImg = document.getElementById('user-avatar-img');
  const userDisplayName = document.getElementById('user-display-name');
  const syncStatusIndicator = document.getElementById('sync-status-indicator');

  // Auth Modal Elements
  const authModal = document.getElementById('auth-modal');
  const closeAuthModalBtn = document.getElementById('close-auth-modal');
  const googleAuthBtn = document.getElementById('google-auth-btn');
  const authTabSignin = document.getElementById('auth-tab-signin');
  const authTabRegister = document.getElementById('auth-tab-register');
  const authStatusMsg = document.getElementById('auth-status-msg');
  const emailAuthForm = document.getElementById('email-auth-form');
  const displayNameGroup = document.getElementById('display-name-group');
  const authNameInput = document.getElementById('auth-name-input');
  const authEmailInput = document.getElementById('auth-email-input');
  const authPasswordInput = document.getElementById('auth-password-input');
  const togglePwdVisibility = document.getElementById('toggle-pwd-visibility');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const continueGuestBtn = document.getElementById('continue-guest-btn');
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');

  // Profile Drawer Elements
  const profileDrawerBackdrop = document.getElementById('profile-drawer-backdrop');
  const profileDrawer = document.getElementById('profile-drawer');
  const closeProfileDrawerBtn = document.getElementById('close-profile-drawer-btn');
  const drawerAvatarImg = document.getElementById('drawer-avatar-img');
  const drawerUserName = document.getElementById('drawer-user-name');
  const drawerUserEmail = document.getElementById('drawer-user-email');
  const drawerSyncBadge = document.getElementById('drawer-sync-badge');
  const vaultGeminiKeyInput = document.getElementById('vault-gemini-key-input');
  const saveVaultKeyBtn = document.getElementById('save-vault-key-btn');
  const vaultFeedbackMsg = document.getElementById('vault-feedback-msg');
  const saveCurrentVibeBtn = document.getElementById('save-current-vibe-btn');
  const drawerPresetsList = document.getElementById('drawer-presets-list');
  const drawerAuthActionBtn = document.getElementById('drawer-auth-action-btn');
  const drawerLogoutBtn = document.getElementById('drawer-logout-btn');

  let activeAuthMode = 'signin'; // 'signin' | 'register'

  function openAuthModal() {
    state.authModalOpen = true;
    if (window.sendRemoteLog) window.sendRemoteLog('OPEN_AUTH_MODAL', { activeAuthMode });
    if (authModal) {
      authModal.style.display = 'flex';
      requestAnimationFrame(() => {
        authModal.classList.add('visible');
      });
    }
    clearAuthFeedback();
  }

  function closeAuthModal() {
    state.authModalOpen = false;
    if (window.sendRemoteLog) window.sendRemoteLog('CLOSE_AUTH_MODAL', {});
    if (authModal) {
      authModal.classList.remove('visible');
      setTimeout(() => {
        if (!state.authModalOpen) authModal.style.display = 'none';
      }, 200);
    }
  }

  function openProfileDrawer() {
    state.profileDrawerOpen = true;
    if (window.sendRemoteLog) window.sendRemoteLog('OPEN_PROFILE_DRAWER', { user: auth.getCurrentUser() });
    if (profileDrawerBackdrop) {
      profileDrawerBackdrop.style.display = 'flex';
      requestAnimationFrame(() => {
        profileDrawerBackdrop.classList.add('visible');
      });
    }
    renderDrawerPresets();
    loadDecryptedVaultKey();
  }

  function closeProfileDrawer() {
    state.profileDrawerOpen = false;
    if (window.sendRemoteLog) window.sendRemoteLog('CLOSE_PROFILE_DRAWER', {});
    if (profileDrawerBackdrop) {
      profileDrawerBackdrop.classList.remove('visible');
      setTimeout(() => {
        if (!state.profileDrawerOpen) profileDrawerBackdrop.style.display = 'none';
      }, 200);
    }
  }

  // Global window fallback triggers
  window.__openAuthModal = openAuthModal;
  window.__closeAuthModal = closeAuthModal;
  window.__openProfileDrawer = openProfileDrawer;
  window.__closeProfileDrawer = closeProfileDrawer;

  function setAuthMode(mode) {
    activeAuthMode = mode;
    clearAuthFeedback();
    if (mode === 'register') {
      authTabRegister.classList.add('active');
      authTabSignin.classList.remove('active');
      displayNameGroup.style.display = 'flex';
      authSubmitBtn.textContent = 'Create Account';
    } else {
      authTabSignin.classList.add('active');
      authTabRegister.classList.remove('active');
      displayNameGroup.style.display = 'none';
      authSubmitBtn.textContent = 'Sign In';
    }
  }

  function showAuthFeedback(msg, type = 'error') {
    if (!authStatusMsg) return;
    authStatusMsg.textContent = msg;
    authStatusMsg.className = `auth-status-msg ${type}`;
    authStatusMsg.style.display = 'block';
  }

  function clearAuthFeedback() {
    if (!authStatusMsg) return;
    authStatusMsg.textContent = '';
    authStatusMsg.style.display = 'none';
  }

  async function loadDecryptedVaultKey() {
    if (!vaultGeminiKeyInput) return;
    try {
      const key = await sync.getDecryptedApiKey();
      if (key) {
        vaultGeminiKeyInput.value = key;
      }
    } catch (e) {}
  }

  function renderDrawerPresets() {
    if (!drawerPresetsList) return;
    const presets = sync.getCustomPresets();
    if (!presets || presets.length === 0) {
      drawerPresetsList.innerHTML = '<p class="empty-list-text">No custom presets saved yet. Customize vibe & click "+ Save Current".</p>';
      return;
    }

    drawerPresetsList.innerHTML = presets.map(p => `
      <div class="preset-card-item" data-preset-id="${p.id}">
        <div class="preset-meta-left">
          <span class="preset-title">${p.name}</span>
          <span class="preset-tag">${p.geometryMode.toUpperCase()} • ${p.moodTag}</span>
        </div>
        <button class="btn-micro apply-preset-btn" data-preset-id="${p.id}">Apply</button>
      </div>
    `).join('');

    drawerPresetsList.querySelectorAll('.apply-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.presetId;
        const target = presets.find(p => p.id === id);
        if (target) {
          state.currentGeometryMode = target.geometryMode;
          const geoSelect = document.getElementById('geometry-mode');
          if (geoSelect) geoSelect.value = target.geometryMode;
          const vibeTag = document.getElementById('vibe-tag');
          if (vibeTag) vibeTag.textContent = target.moodTag;
          closeProfileDrawer();
        }
      });
    });
  }

  // Top Nav Profile Pill Action
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentUser = auth.getCurrentUser();
      if (currentUser && !currentUser.isGuest) {
        openProfileDrawer();
      } else {
        openAuthModal();
      }
    });
  }

  // Auth Modal Listeners
  if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (authTabSignin) authTabSignin.addEventListener('click', () => setAuthMode('signin'));
  if (authTabRegister) authTabRegister.addEventListener('click', () => setAuthMode('register'));

  if (togglePwdVisibility && authPasswordInput) {
    togglePwdVisibility.addEventListener('click', () => {
      const isPwd = authPasswordInput.type === 'password';
      authPasswordInput.type = isPwd ? 'text' : 'password';
      togglePwdVisibility.textContent = isPwd ? '🙈' : '👁️';
    });
  }

  const ONBOARDING_STORAGE_KEY = 'aurawave_onboarding_completed';

  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearAuthFeedback();
      try {
        await auth.loginWithGoogle();
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        showAuthFeedback('Signed in successfully with Google!', 'success');
        setTimeout(closeAuthModal, 600);
      } catch (err) {
        showAuthFeedback(err.message || 'Google sign-in failed', 'error');
      }
    });
  }

  if (emailAuthForm) {
    emailAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthFeedback();
      const email = authEmailInput.value;
      const password = authPasswordInput.value;
      const displayName = authNameInput.value;

      try {
        if (activeAuthMode === 'register') {
          await auth.registerWithEmail(email, password, displayName);
          showAuthFeedback('Account created successfully!', 'success');
        } else {
          await auth.loginWithEmail(email, password);
          showAuthFeedback('Welcome back! Signed in.', 'success');
        }
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        setTimeout(() => {
          closeAuthModal();
          authEmailInput.value = '';
          authPasswordInput.value = '';
          authNameInput.value = '';
        }, 600);
      } catch (err) {
        showAuthFeedback(err.message || 'Authentication error', 'error');
      }
    });
  }

  if (continueGuestBtn) {
    continueGuestBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      auth.loginAsGuest();
      closeAuthModal();
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthFeedback('Password reset link would be sent to your email address.', 'success');
    });
  }

  // Profile Drawer Listeners
  if (closeProfileDrawerBtn) closeProfileDrawerBtn.addEventListener('click', closeProfileDrawer);
  if (profileDrawerBackdrop) {
    profileDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === profileDrawerBackdrop) closeProfileDrawer();
    });
  }

  if (saveVaultKeyBtn && vaultGeminiKeyInput) {
    saveVaultKeyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = vaultGeminiKeyInput.value.trim();
      if (!key) {
        if (vaultFeedbackMsg) vaultFeedbackMsg.textContent = 'Please enter a valid key';
        return;
      }
      try {
        await sync.saveEncryptedApiKey(key);
        if (vaultFeedbackMsg) {
          vaultFeedbackMsg.textContent = '✓ Encrypted with AES-256 & saved locally!';
          setTimeout(() => { vaultFeedbackMsg.textContent = ''; }, 3000);
        }
      } catch (err) {
        if (vaultFeedbackMsg) vaultFeedbackMsg.textContent = 'Failed to save key';
      }
    });
  }

  if (saveCurrentVibeBtn) {
    saveCurrentVibeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const name = prompt('Name your custom 3D vibe preset:', `${state.currentGeometryMode.toUpperCase()} Custom Vibe`);
      if (!name) return;
      try {
        await sync.saveCustomPreset({
          name: name,
          geometryMode: state.currentGeometryMode,
          themeSpeed: state.themeSpeed,
          themeWaveIntensity: state.themeWaveIntensity,
          moodTag: document.getElementById('vibe-tag')?.textContent || 'CUSTOM VIBE'
        });
        renderDrawerPresets();
      } catch (err) {
        alert('Failed to save preset');
      }
    });
  }

  if (drawerAuthActionBtn) {
    drawerAuthActionBtn.addEventListener('click', () => {
      closeProfileDrawer();
      setTimeout(() => {
        openAuthModal();
      }, 250);
    });
  }

  if (drawerLogoutBtn) {
    drawerLogoutBtn.addEventListener('click', () => {
      auth.logout();
      closeProfileDrawer();
      setTimeout(() => {
        openAuthModal();
      }, 250);
    });
  }

  // First Launch Onboarding Check:
  // Automatically show the Welcome Modal if the user is not signed in and hasn't dismissed it before
  const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  const initialUser = auth.getCurrentUser();
  if ((!initialUser || initialUser.isGuest) && !hasCompletedOnboarding) {
    setTimeout(() => {
      openAuthModal();
    }, 450);
  }

  // Sync Auth State to UI
  auth.onAuthStateChanged((user) => {
    if (!user || user.isGuest) {
      if (userDisplayName) userDisplayName.textContent = 'Sign In';
      if (userAvatarImg) userAvatarImg.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest';
      if (drawerUserName) drawerUserName.textContent = 'Guest Explorer';
      if (drawerUserEmail) drawerUserEmail.textContent = 'Not signed in (Local Session)';
      if (drawerAvatarImg) drawerAvatarImg.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest';
      if (drawerAuthActionBtn) drawerAuthActionBtn.textContent = 'Sign In / Create Account';
      if (drawerLogoutBtn) drawerLogoutBtn.style.display = 'none';
    } else {
      const name = user.displayName || user.email.split('@')[0];
      if (userDisplayName) userDisplayName.textContent = name;
      const avatar = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
      if (userAvatarImg) userAvatarImg.src = avatar;
      if (drawerUserName) drawerUserName.textContent = name;
      if (drawerUserEmail) drawerUserEmail.textContent = user.email;
      if (drawerAvatarImg) drawerAvatarImg.src = avatar;
      if (drawerAuthActionBtn) drawerAuthActionBtn.textContent = 'Switch Account';
      if (drawerLogoutBtn) drawerLogoutBtn.style.display = 'block';
    }
  });

  // Sync Status to Indicator Dot & Drawer Badge
  sync.onSyncStatusChanged((status) => {
    if (syncStatusIndicator) {
      syncStatusIndicator.className = `sync-status-indicator ${status}`;
      syncStatusIndicator.title = status === 'synced' ? 'Cloud Synced' : (status === 'syncing' ? 'Syncing...' : 'Offline');
    }
    if (drawerSyncBadge) {
      drawerSyncBadge.className = `sync-badge ${status}`;
      drawerSyncBadge.textContent = status === 'synced' ? '🟢 Cloud Synced' : (status === 'syncing' ? '🔄 Syncing...' : '⚠️ Offline Mode');
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.authModalOpen) closeAuthModal();
      if (state.profileDrawerOpen) closeProfileDrawer();
    }
  });
}





