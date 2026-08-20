import { useState, useEffect, useCallback } from 'react';

import { 
  FolderOpen, 
  X, 
  Minus, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  HardDrive, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  Play,
  Zap,
  Sliders,
  Cpu,
  Radio,
  Activity,
  Layers,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import './index.css';

// Audio feedback synthesizer for high-tech UI feel
const playCyberBlip = (freq = 880, type = 'sine', duration = 0.035) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful fallback if audio context is restricted
  }
};

const SHOWCASE_SLIDES = [
  {
    id: 'shaders',
    badge: 'REAL-TIME GPU GRAPHICS',
    badgeColor: '#00f0ff',
    title: 'Audio-Reactive 3D Shaders',
    description: '6,400 audio-reactive vertices animated with custom WebGL shader physics, morphing geometries, and instant frequency ripples.',
    tags: ['60 FPS Shaders', 'WebGL 3D Grid', 'Zero Artifacts'],
    type: 'video',
    mediaSrc: './mascot_black.mp4'
  },
  {
    id: 'ai-vibe',
    badge: 'GEMINI 3.6 AI ENGINE',
    badgeColor: '#a855f7',
    title: 'Neural Vibe Generation',
    description: 'Real-time aesthetic adaptation powered by Google Gemini — translates your music into poetic color palettes, camera sweeps, and dynamic visual rhythms.',
    tags: ['Gemini Flash 3.6', 'Adaptive Prompting', 'Dynamic Palettes'],
    type: 'neural-graphic'
  },
  {
    id: 'dsp-matrix',
    badge: 'SUB-10MS LATENCY MATRIX',
    badgeColor: '#ff4655',
    title: 'Hardware-Accelerated DSP Engine',
    description: 'High-fidelity Fast Fourier Transform (FFT) analysis mapping bass punch, mid presence, and treble sparkle directly to 3D geometry.',
    tags: ['Low Latency FFT', 'Multi-Band Analysis', 'ID3 Audio Parser'],
    type: 'dsp-graphic'
  }
];

const INSTALL_MILESTONES = [
  { id: 1, label: 'Unpacking 3D Shader Matrix (6,400 vertices)', threshold: 28 },
  { id: 2, label: 'Calibrating DSP Audio Frequency Engine', threshold: 62 },
  { id: 3, label: 'Registering Windows Shortcuts & AppData', threshold: 88 },
  { id: 4, label: 'Finalizing AuraWave 3D Environment', threshold: 100 }
];

function App() {
  const [installPath, setInstallPath] = useState('');
  const [setupMode, setSetupMode] = useState('quick'); // 'quick' | 'custom'
  const [createShortcut, setCreateShortcut] = useState(true);
  const [createStartMenu, setCreateStartMenu] = useState(true);
  const [autoLaunch, setAutoLaunch] = useState(true);
  
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [installedPath, setInstalledPath] = useState(null);

  const [mode, setMode] = useState('install'); // 'install' | 'uninstall'
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const slideDuration = 4500; // 4.5s per slide

  // Auto-Launch Countdown State
  const [countdown, setCountdown] = useState(3);
  const [autoLaunchCancelled, setAutoLaunchCancelled] = useState(false);

  useEffect(() => {
    // Get mode (install vs uninstall)
    window.electronAPI?.getInstallerMode().then(setMode);

    // Get default path on load
    window.electronAPI?.getDefaultPath().then(setInstallPath);
    
    // Listen for progress updates
    window.electronAPI?.onInstallProgress((data) => {
      setProgress(data.percent);
      setStatus(data.status);
    });

    window.electronAPI?.onUninstallProgress((data) => {
      setProgress(data.percent);
      setStatus(data.status);
    });
  }, []);

  // Carousel Auto-Advance Timer
  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const step = (interval / slideDuration) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((curr) => (curr + 1) % SHOWCASE_SLIDES.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, currentSlide]);

  const handleLaunch = useCallback(() => {
    playCyberBlip(1400, 'sine', 0.05);
    window.electronAPI?.launchApp(installedPath);
  }, [installedPath]);

  // Auto-Launch Countdown Handler
  useEffect(() => {
    if (installedPath && mode === 'install' && !autoLaunchCancelled && autoLaunch) {
      if (countdown <= 0) {
        handleLaunch();
        return;
      }
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [installedPath, mode, countdown, autoLaunchCancelled, autoLaunch, handleLaunch]);


  const handleSelectSlide = (index) => {
    playCyberBlip(1100, 'sine', 0.02);
    setCurrentSlide(index);
    setSlideProgress(0);
  };

  const handleNextSlide = () => {
    playCyberBlip(1200, 'sine', 0.025);
    setCurrentSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    setSlideProgress(0);
  };

  const handlePrevSlide = () => {
    playCyberBlip(950, 'sine', 0.025);
    setCurrentSlide((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
    setSlideProgress(0);
  };

  const handleTabChange = (newTab) => {
    playCyberBlip(750, 'sine', 0.03);
    setSetupMode(newTab);
  };

  const handleSelectDir = async () => {
    playCyberBlip(800, 'sine', 0.03);
    const dir = await window.electronAPI?.selectDirectory();
    if (dir) setInstallPath(dir);
  };

  const handleInstall = async () => {
    if (!installPath) return;
    playCyberBlip(600, 'triangle', 0.08);
    setInstalling(true);
    setProgress(0);
    setStatus('Preparing installation matrix...');
    const result = await window.electronAPI?.installApp({
      targetDir: installPath,
      createDesktopShortcut: createShortcut
    });

    if (result?.success) {
      setInstalledPath(result.exePath);
      setCountdown(3);
    } else {
      setStatus('Installation failed: ' + (result?.error || 'Unknown error'));
    }
  };

  const handleRetry = () => {
    setInstalling(false);
    setStatus('');
    setProgress(0);
  };


  const activeSlideData = SHOWCASE_SLIDES[currentSlide];

  return (
    <div className="installer-container asymmetric-layout">
      {/* Top Drag & Window Controls Titlebar */}
      <div className="titlebar">
        <div className="drag-region">
          <div className="titlebar-badge">
            <span className="app-dot"></span>
            <span className="app-title">AuraWave 3D</span>
            <span className="app-subtitle">{mode === 'uninstall' ? 'Uninstaller' : 'Installer'}</span>
            <span className="app-version-tag">v1.4.0</span>
          </div>
        </div>
        <div className="window-controls">
          <button onClick={() => window.electronAPI?.windowMinimize()} title="Minimize">
            <Minus size={15} />
          </button>
          <button onClick={() => window.electronAPI?.windowClose()} className="close-btn" title="Close">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Grid: Left Control (35%) + Right Showcase (65%) */}
      <div className="installer-split-grid">
        
        {/* =========================================================================
            LEFT CONTROL COLUMN (~35% / 330px)
            ========================================================================= */}
        <div className="left-control-column">
          
          {/* Branding Header */}
          <div className="left-branding">
            <div className="brand-badge-pill">
              <Sparkles size={12} className="sparkle-icon" />
              <span>Next-Gen Audio Visualizer</span>
            </div>
            <h1 className="brand-logo-text">
              AuraWave<span>3D</span>
            </h1>
            <p className="brand-tagline">Real-Time WebGL & AI Music Experience</p>
          </div>

          {/* INSTALL MODE - CONFIGURATION */}
          {mode === 'install' && !installing && !installedPath && (
            <div className="control-body slide-in">
              {/* Segmented Mode Pill Switcher */}
              <div className="segmented-switcher">
                <button 
                  className={`switch-tab ${setupMode === 'quick' ? 'active' : ''}`}
                  onClick={() => handleTabChange('quick')}
                >
                  <Zap size={14} />
                  <span>Quick Setup</span>
                </button>
                <button 
                  className={`switch-tab ${setupMode === 'custom' ? 'active' : ''}`}
                  onClick={() => handleTabChange('custom')}
                >
                  <Sliders size={14} />
                  <span>Custom Options</span>
                </button>
              </div>

              {/* QUICK SETUP VIEW */}
              {setupMode === 'quick' && (
                <div className="mode-content-view fade-in">
                  <div className="quick-summary-card">
                    <div className="summary-row">
                      <span className="summary-label">Install Size</span>
                      <span className="summary-val highlight">~150 MB</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Target Location</span>
                      <span className="summary-val path-truncate" title={installPath}>
                        {installPath ? installPath.replace(/.*[\\/]/, '.../') : 'Default AppData'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Shortcut Toggle */}
                  <div 
                    className="option-card compact"
                    onClick={() => {
                      playCyberBlip(1000, 'sine', 0.02);
                      setCreateShortcut(!createShortcut);
                    }}
                  >
                    <div className={`cyber-checkbox ${createShortcut ? 'checked' : ''}`}>
                      {createShortcut && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="option-info">
                      <span className="option-title">Create Desktop Shortcut</span>
                    </div>
                  </div>

                  {/* Giant Glowing Primary CTA */}
                  <div className="action-area">
                    <button className="cyber-btn primary giant-cta" onClick={handleInstall}>
                      <Zap size={18} />
                      <span>INSTALL NOW (150 MB)</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* CUSTOM OPTIONS VIEW */}
              {setupMode === 'custom' && (
                <div className="mode-content-view fade-in">
                  {/* Directory Picker */}
                  <div className="custom-section">
                    <label className="section-label">Installation Directory</label>
                    <div className="directory-picker">
                      <input 
                        type="text" 
                        value={installPath} 
                        readOnly 
                        className="cyber-input"
                        title={installPath}
                      />
                      <button 
                        className="cyber-btn browse-btn" 
                        onClick={handleSelectDir}
                        title="Choose custom directory"
                      >
                        <FolderOpen size={15} />
                        <span>Browse...</span>
                      </button>
                    </div>
                  </div>

                  {/* Drive Storage Capacity Meter */}
                  <div className="storage-capacity-meter">
                    <div className="storage-header">
                      <div className="storage-title">
                        <HardDrive size={13} />
                        <span>Disk Allocation</span>
                      </div>
                      <span className="storage-free">142.5 GB Free</span>
                    </div>
                    <div className="storage-bar-track">
                      <div className="storage-bar-fill" style={{ width: '4%' }}></div>
                    </div>
                    <div className="storage-footer">
                      <span>Space Required: 150 MB</span>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="custom-options-list">
                    <div 
                      className="option-card"
                      onClick={() => {
                        playCyberBlip(1000, 'sine', 0.02);
                        setCreateShortcut(!createShortcut);
                      }}
                    >
                      <div className={`cyber-checkbox ${createShortcut ? 'checked' : ''}`}>
                        {createShortcut && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="option-info">
                        <span className="option-title">Create Desktop Shortcut</span>
                        <span className="option-desc">Add quick launch icon to desktop</span>
                      </div>
                    </div>

                    <div 
                      className="option-card"
                      onClick={() => {
                        playCyberBlip(1000, 'sine', 0.02);
                        setCreateStartMenu(!createStartMenu);
                      }}
                    >
                      <div className={`cyber-checkbox ${createStartMenu ? 'checked' : ''}`}>
                        {createStartMenu && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="option-info">
                        <span className="option-title">Start Menu Folder</span>
                        <span className="option-desc">Register in Windows Start Menu</span>
                      </div>
                    </div>

                    <div 
                      className="option-card"
                      onClick={() => {
                        playCyberBlip(1000, 'sine', 0.02);
                        setAutoLaunch(!autoLaunch);
                      }}
                    >
                      <div className={`cyber-checkbox ${autoLaunch ? 'checked' : ''}`}>
                        {autoLaunch && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="option-info">
                        <span className="option-title">Launch on Finish</span>
                        <span className="option-desc">Start AuraWave 3D after setup completes</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="action-area">
                    <button className="cyber-btn primary" onClick={handleInstall}>
                      <span>Install with Custom Options</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Left Panel Footer */}
              <div className="left-column-footer">
                <span>By installing, you agree to the Terms of Service.</span>
              </div>
            </div>
          )}

          {/* INSTALLING PROGRESS HUD WITH MULTI-STAGE MATRIX */}
          {mode === 'install' && installing && !installedPath && (
            <div className="control-body progress-hud slide-in">
              <div className="hud-status-badge">
                <Activity size={13} className="spinning-icon" />
                <span>ACTIVE DECOMPRESSION MATRIX</span>
              </div>

              <h2 className="hud-title">
                {status.startsWith('Install failed') ? 'Installation Error' : 'Installing Client'}
              </h2>
              <p className="hud-sub">
                {status.startsWith('Install failed') 
                  ? 'An error occurred during extraction' 
                  : 'Setting up files, audio drivers, and shaders...'}
              </p>

              {/* Progress Bar Container */}
              <div className="progress-bar-container">
                <div 
                  className={`progress-bar-fill ${status.startsWith('Install failed') ? 'error' : ''}`} 
                  style={{ width: `${progress}%` }}
                >
                  <div className="progress-glow-head"></div>
                </div>
              </div>

              <div className="progress-status-row">
                <span className="status-text">{status || 'Extracting core package...'}</span>
                <span className="percent-text">{progress}%</span>
              </div>

              {/* Live Phased Milestone Checkpoints */}
              {!status.startsWith('Install failed') && (
                <div className="milestone-checkpoints">
                  {INSTALL_MILESTONES.map((m) => {
                    const isDone = progress >= m.threshold;
                    const isCurrent = !isDone && progress >= (m.threshold - 28);
                    return (
                      <div 
                        key={m.id} 
                        className={`milestone-item ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`}
                      >
                        <div className="milestone-icon">
                          {isDone ? (
                            <CheckCircle2 size={13} className="done-icon" />
                          ) : isCurrent ? (
                            <Loader2 size={13} className="spin-icon" />
                          ) : (
                            <span className="pending-dot"></span>
                          )}
                        </div>
                        <span className="milestone-label">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {status.startsWith('Install failed') && (
                <div className="action-area">
                  <button className="cyber-btn secondary" onClick={handleRetry}>
                    <RotateCcw size={16} />
                    <span>Retry Setup</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INSTALL COMPLETE VIEW WITH SMART COUNTDOWN */}
          {mode === 'install' && installedPath && (
            <div className="control-body success-view slide-in">
              <div className="success-badge-wrapper">
                <div className="success-badge-pulse"></div>
                <div className="success-icon">
                  <Check size={32} strokeWidth={3} />
                </div>
              </div>
              
              <h2 className="hud-title">Ready to Ignite</h2>
              <p className="hud-sub">
                AuraWave 3D has been successfully installed and calibrated.
              </p>

              <div className="installed-info-card">
                <span className="info-label">Installed Directory:</span>
                <span className="info-val path-truncate" title={installPath}>{installPath}</span>
              </div>

              {/* Auto Launch Countdown Ticker */}
              {!autoLaunchCancelled && autoLaunch && (
                <div className="countdown-pill">
                  <span className="countdown-dot"></span>
                  <span>Auto-launching in {countdown}s...</span>
                  <button 
                    className="countdown-cancel-btn"
                    onClick={() => setAutoLaunchCancelled(true)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="action-area">
                <button className="cyber-btn primary launch-btn giant-cta" onClick={handleLaunch}>
                  <Play size={18} fill="currentColor" />
                  <span>Launch AuraWave 3D Now</span>
                  <ChevronRight size={18}/>
                </button>
              </div>
            </div>
          )}

          {/* UNINSTALL MODE */}
          {mode === 'uninstall' && !installing && !installedPath && (
            <div className="control-body slide-in">
              <div className="uninstall-hero">
                <div className="uninstall-warning-badge">
                  <AlertTriangle size={32} color="#ff3366" />
                </div>
                <h2>Uninstall Client</h2>
                <p className="uninstall-sub">
                  This will remove the application, shortcuts, and configuration data from your PC.
                </p>
              </div>

              <div className="uninstall-info-box">
                <div className="info-row">
                  <span className="label">Target:</span>
                  <span className="value path-truncate">{installPath || 'AuraWave 3D Directory'}</span>
                </div>
              </div>

              <div className="action-area">
                <button 
                  className="cyber-btn danger uninstall-cta"
                  onClick={async () => {
                    setInstalling(true);
                    setProgress(0);
                    setStatus('Preparing to uninstall...');
                    const result = await window.electronAPI?.uninstallApp(installPath);
                    if (result?.success) {
                      setInstalledPath(true);
                    } else {
                      setStatus('Uninstall failed: ' + (result?.error || 'Unknown error'));
                    }
                  }}
                >
                  <span>Confirm Uninstall</span>
                </button>
              </div>
            </div>
          )}

          {/* UNINSTALL PROGRESS */}
          {mode === 'uninstall' && installing && !installedPath && (
            <div className="control-body progress-hud slide-in">
              <h2>{status.startsWith('Uninstall failed') ? 'Removal Error' : 'Uninstalling AuraWave 3D'}</h2>
              <p className="progress-sub">Cleaning up files and registry keys...</p>

              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill error" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="progress-glow-head"></div>
                </div>
              </div>

              <div className="progress-status-row">
                <span className="status-text">{status}</span>
                <span className="percent-text">{progress}%</span>
              </div>

              {status.startsWith('Uninstall failed') && (
                <div className="action-area">
                  <button className="cyber-btn secondary" onClick={handleRetry}>
                    <RotateCcw size={16} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* UNINSTALL SUCCESS */}
          {mode === 'uninstall' && installedPath && (
            <div className="control-body success-view slide-in">
              <div className="success-icon danger-icon">
                <Check size={36} color="#ff3366" />
              </div>
              <h2>Uninstall Complete</h2>
              <p className="success-desc">AuraWave 3D has been completely removed from your PC.</p>
              <div className="action-area">
                <button 
                  className="cyber-btn secondary" 
                  onClick={() => {
                    window.electronAPI?.showOutro();
                  }}
                >
                  <span>Finish & Exit</span>
                </button>
              </div>
            </div>
          )}

        </div>


        {/* =========================================================================
            RIGHT SHOWCASE HERO CAROUSEL (~65% / 500px)
            ========================================================================= */}
        <div 
          className="right-showcase-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Ambient Background Aura */}
          <div className={`showcase-ambient-glow slide-${currentSlide}`}></div>

          {/* Background Media & Visual Animations */}
          <div className="showcase-media-stage">
            {/* Slide 0: Mascot Screen Video & Hologram Pedestal */}
            <div className={`slide-media-item ${currentSlide === 0 ? 'active' : ''}`}>
              <div className="mascot-screen-container">
                <div className="mascot-hologram-pedestal"></div>
                <video 
                  src="./mascot_black.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="mascot-screen-video"
                />
                <div className="mascot-energy-ring r-outer"></div>
                <div className="mascot-energy-ring r-inner"></div>
                <div className="video-hologram-grid"></div>
              </div>
            </div>

            {/* Slide 1: AI Neural Constellation */}
            <div className={`slide-media-item ${currentSlide === 1 ? 'active' : ''}`}>
              <div className="neural-graphic-container">
                <div className="neural-core-orb"></div>
                <div className="neural-ring r1"></div>
                <div className="neural-ring r2"></div>
                <div className="floating-prompt-chips">
                  <span className="chip c1"><Sparkles size={11} /> Neon Cyberpunk</span>
                  <span className="chip c2"><Radio size={11} /> Liquid Euphoria</span>
                  <span className="chip c3"><Cpu size={11} /> Ambient Resonance</span>
                </div>
              </div>
            </div>

            {/* Slide 2: Hardware DSP Spectrum Matrix */}
            <div className={`slide-media-item ${currentSlide === 2 ? 'active' : ''}`}>
              <div className="dsp-graphic-container">
                <div className="dsp-analyzer-bars">
                  {[45, 80, 60, 95, 70, 100, 85, 40, 90, 65, 75, 55].map((h, i) => (
                    <span 
                      key={i} 
                      className="dsp-bar" 
                      style={{ 
                        height: `${h}%`,
                        animationDelay: `${i * 0.08}s`
                      }}
                    ></span>
                  ))}
                </div>
                <div className="dsp-latency-badge">
                  <Activity size={12} />
                  <span>&lt; 10ms DSP LATENCY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Text & Captions Overlay */}
          <div className="showcase-content-overlay">
            <div className="showcase-badge" style={{ borderColor: activeSlideData.badgeColor, color: activeSlideData.badgeColor }}>
              <span className="badge-dot" style={{ background: activeSlideData.badgeColor }}></span>
              <span>{activeSlideData.badge}</span>
            </div>

            <h2 className="showcase-title">{activeSlideData.title}</h2>
            <p className="showcase-desc">{activeSlideData.description}</p>

            <div className="showcase-tags">
              {activeSlideData.tags.map((tag, i) => (
                <span key={i} className="feature-pill">
                  <Layers size={11} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Carousel Navigation Controls (Bottom Bar) */}
          <div className="carousel-nav-bar">
            {/* Timeline Progress Bars */}
            <div className="carousel-indicators">
              {SHOWCASE_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  className={`indicator-track ${currentSlide === idx ? 'active' : ''}`}
                  onClick={() => handleSelectSlide(idx)}
                  title={`View ${slide.title}`}
                >
                  <div 
                    className="indicator-fill"
                    style={{ 
                      width: currentSlide === idx ? `${slideProgress}%` : currentSlide > idx ? '100%' : '0%' 
                    }}
                  ></div>
                </button>
              ))}
            </div>

            {/* Arrows */}
            <div className="carousel-arrows">
              <button className="arrow-btn" onClick={handlePrevSlide} title="Previous Feature">
                <ChevronLeft size={16} />
              </button>
              <button className="arrow-btn" onClick={handleNextSlide} title="Next Feature">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
