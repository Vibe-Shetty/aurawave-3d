import { defineConfig } from 'vite';
import { Innertube, UniversalCache } from 'youtubei.js';

let ytDevInstance = null;
async function getDevInnertube() {
  if (!ytDevInstance) {
    ytDevInstance = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
  }
  return ytDevInstance;
}

const devUrlCache = new Map();

async function resolveDevAudioStream(videoId) {
  const cached = devUrlCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  const yt = await getDevInnertube();
  const response = await yt.actions.execute('/player', {
    videoId: videoId,
    client: 'IOS',
    parse: false
  });

  const data = response.data;
  const formats = (data.streamingData?.adaptiveFormats || [])
    .concat(data.streamingData?.formats || [])
    .filter(f => f.mimeType && f.mimeType.startsWith('audio/'));

  const bestAudio = formats.find(f => f.url);
  if (!bestAudio || !bestAudio.url) {
    throw new Error(`No audio stream URL available for ${videoId}`);
  }

  devUrlCache.set(videoId, {
    url: bestAudio.url,
    expiresAt: Date.now() + 4 * 60 * 60 * 1000
  });

  return bestAudio.url;
}

function youtubeStreamingPlugin() {
  return {
    name: 'youtube-streaming-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost:8005');
        
        // Remote client logger endpoint
        if (url.pathname === '/api/client-log') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            console.log(`[CLIENT-LOG] ->`, body);
            res.setHeader('Content-Type', 'application/json');
            res.end('{"status":"ok"}');
          });
          return;
        }

        // Direct audio streaming proxy endpoint
        if (url.pathname === '/api/stream') {
          const videoId = url.searchParams.get('id');
          if (!videoId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('Missing video id');
          }

          try {
            const remoteUrl = await resolveDevAudioStream(videoId);
            const fetchHeaders = {
              'User-Agent': 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)'
            };
            if (req.headers.range) {
              fetchHeaders['Range'] = req.headers.range;
            }

            const remoteRes = await fetch(remoteUrl, { headers: fetchHeaders });
            const responseHeaders = {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': remoteRes.headers.get('content-type') || 'audio/mp4',
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'no-cache'
            };

            if (remoteRes.headers.get('content-length')) {
              responseHeaders['Content-Length'] = remoteRes.headers.get('content-length');
            }
            if (remoteRes.headers.get('content-range')) {
              responseHeaders['Content-Range'] = remoteRes.headers.get('content-range');
            }

            res.writeHead(remoteRes.status, responseHeaders);

            if (remoteRes.body) {
              const reader = remoteRes.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            }
            res.end();
            return;
          } catch (err) {
            console.error('Dev stream error:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(err.message);
            return;
          }
        }

        // Music search endpoint
        if (url.pathname === '/api/search') {
          const query = url.searchParams.get('q') || '';
          if (!query) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify([]));
          }

          try {
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const response = await fetch(ytUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            });
            const html = await response.text();
            
            let ytData = null;
            const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.*?});/);
            if (match) {
              ytData = JSON.parse(match[1]);
            }

            const results = [];
            if (ytData && ytData.contents) {
              const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
              for (const item of contents) {
                const v = item.videoRenderer;
                if (v && v.videoId) {
                  const title = v.title?.runs?.[0]?.text || 'Unknown Title';
                  const author = v.ownerText?.runs?.[0]?.text || 'YouTube Music';
                  const duration = v.lengthText?.simpleText || '3:30';
                  const thumbnails = v.thumbnail?.thumbnails || [];
                  const cover = thumbnails[thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
                  
                  const parts = duration.split(':').map(Number);
                  let durationSec = 180;
                  if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
                  else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];

                  results.push({
                    id: `yt-${v.videoId}`,
                    videoId: v.videoId,
                    title: title,
                    artist: author,
                    genre: 'YouTube Music',
                    cover: cover,
                    streamUrl: `/api/stream?id=${v.videoId}`,
                    duration: durationSec,
                    durationStr: duration,
                    isLive: false,
                    isYouTube: true
                  });
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(results.slice(0, 20)));
          } catch (err) {
            console.error("YouTube search error:", err);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify([]));
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    port: 8005,
    strictPort: true,
    open: false,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  },
  plugins: [
    youtubeStreamingPlugin()
  ],
  build: {
    outDir: 'dist',
  }
});
