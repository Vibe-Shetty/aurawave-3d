import os
import re

src_dir = os.path.join(os.path.dirname(__file__), 'src')

vars_to_replace = [
  "audioCtx", "analyser", "dataArray", "masterAudioElement", "mediaSourceNode",
  "isPlaying", "synthTimer", "synthTimeElapsed", "audioSourceType", "selectedPreset",
  "currentGeometryMode", "isShuffle", "repeatMode", "currentVolume", "isMuted",
  "isDraggingScrubber", "playlist", "currentTrackIndex", "mouseX", "mouseY",
  "targetX", "targetY", "time", "themeSpeed", "themeWaveIntensity", "currentEnergy",
  "targetEnergy", "cameraBaseZ", "cameraBaseY"
]

pattern = re.compile(r'\b(' + '|'.join(vars_to_replace) + r')\b')

for filename in ['audio.js', 'render.js', 'ui.js']:
    filepath = os.path.join(src_dir, filename)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace the vars with state.var, avoiding double replacement if already state.var
    # We can use a negative lookbehind to ensure it's not preceded by 'state.' or '.'
    # Actually, simpler: replace all, then fix 'state.state.' or '.state.' if they happen,
    # or just use proper regex.
    new_content = re.sub(r'(?<!\.)\b(' + '|'.join(vars_to_replace) + r')\b', r'state.\1', content)
    
    # Prepend import
    import_stmt = "import { state } from './state.js';\n"
    if filename == 'ui.js':
        # ui needs audio and render functions
        import_stmt += "import { initAudioEngine, togglePlayPause, playNextTrack, playPreviousTrack, setVolume, toggleMute, playTrack, initAudioContext, stopAudioEngine } from './audio.js';\n"
        import_stmt += "import { initThreeJS, updateThemeColors, setGeometryMode, resizeRenderer, getRendererDomElement, updateVisuals } from './render.js';\n"
    elif filename == 'audio.js':
        import_stmt += "import { updateThemeColors, setGeometryMode } from './render.js';\n"
        # ui functions like updateHUD are needed but there's a circular dependency.
        # we can put updateHUD, updateTimeline in ui.js, and export them.
        import_stmt += "import { updateHUD, updateTimeline, updateEqualizerBars } from './ui.js';\n"
    elif filename == 'render.js':
        pass
        
    new_content = import_stmt + "\n" + new_content
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

# Rewrite state.js
state_js_content = """export const state = {
  audioCtx: null,
  analyser: null,
  dataArray: null,
  masterAudioElement: null,
  mediaSourceNode: null,
  isPlaying: false,
  synthTimer: null,
  synthTimeElapsed: 0,
  audioSourceType: 'synth',
  selectedPreset: 'cyberpunk',
  currentGeometryMode: 'wave',
  isShuffle: false,
  repeatMode: 'all',
  currentVolume: 0.85,
  isMuted: false,
  isDraggingScrubber: false,
  currentTrackIndex: 0,
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
  playlist: [
    { id: 'preset_cyberpunk', title: 'Cyberpunk Synthwave', artist: 'AuraWave AI Synth', language: 'Procedural 120 BPM', genre: 'Synthwave', duration: 180, type: 'synth', preset: 'cyberpunk' },
    { id: 'preset_lofi', title: 'Lo-Fi Sunset Chill', artist: 'AuraWave AI Synth', language: 'Procedural 85 BPM', genre: 'Lo-Fi Chill', duration: 210, type: 'synth', preset: 'lofi' },
    { id: 'preset_ambient', title: 'Space Ambient & Drones', artist: 'AuraWave AI Synth', language: 'Generative Soundscape', genre: 'Ambient', duration: 240, type: 'synth', preset: 'ambient' },
    { id: 'preset_electro', title: 'Electro House Bounce', artist: 'AuraWave AI Synth', language: 'Procedural 128 BPM', genre: 'Electro House', duration: 195, type: 'synth', preset: 'electro' }
  ]
};
"""

state_js_path = os.path.join(src_dir, 'state.js')
with open(state_js_path, 'w', encoding='utf-8') as f:
    f.write(state_js_content)

print("Refactored modules!")
