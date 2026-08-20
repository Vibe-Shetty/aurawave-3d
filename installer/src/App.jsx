import { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  X, 
  Minus, 
  Check, 
  ChevronRight, 
  HardDrive, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  Play
} from 'lucide-react';
import './index.css';


function App() {
  const [installPath, setInstallPath] = useState('');
  const [createShortcut, setCreateShortcut] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [installedPath, setInstalledPath] = useState(null);

  const [mode, setMode] = useState('install');


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

  const handleSelectDir = async () => {
    const dir = await window.electronAPI?.selectDirectory();
    if (dir) setInstallPath(dir);
  };

  const handleInstall = async () => {
    if (!installPath) return;
    setInstalling(true);
    setProgress(0);
    setStatus('Preparing installation...');
    const result = await window.electronAPI?.installApp({
      targetDir: installPath,
      createDesktopShortcut: createShortcut
    });

    if (result?.success) {
      setInstalledPath(result.exePath);
    } else {
      setStatus('Installation failed: ' + (result?.error || 'Unknown error'));
      // Do not reset installing state so the error remains visible
    }
  };

  const handleLaunch = () => {
    window.electronAPI?.launchApp(installedPath);
  };

  const handleRetry = () => {
    setInstalling(false);
    setStatus('');
    setProgress(0);
  };

  return (
    <div className="installer-container">
      {/* Custom Titlebar */}
      <div className="titlebar">
        <div className="drag-region">
          <div className="titlebar-badge">
            <span className="app-dot"></span>
            <span className="app-title">AuraWave 3D</span>
            <span className="app-subtitle">{mode === 'uninstall' ? 'Maintenance Wizard' : 'Installer v1.0'}</span>
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

      <div className="installer-content">
        {/* Left Panel - Branding & Mascot */}
        <div className="left-panel">
          <div className="branding">
            <div className="brand-tag">
              <Sparkles size={13} className="sparkle-icon" />
              <span>Next-Gen Visualizer</span>
            </div>
            <h1>AuraWave<span>3D</span></h1>
            <p>Audio-Reactive 3D Environments & Shaders</p>
          </div>

          <div className="mascot-placeholder">
            <div className="mascot-ambient-glow"></div>
            <video 
              src="./mascot_black.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="mascot-screen-video"
            />
          </div>

          <div className="left-footer-badges">
            <span className="tech-badge">DirectX 12 / WebGPU</span>
            <span className="tech-badge">Spatial Audio FX</span>
          </div>
        </div>

        {/* Right Panel - Setup / Progress / Finished */}
        <div className="right-panel">
          
          {mode === 'install' && !installing && !installedPath && (
            <div className="setup-form slide-in">
              <div className="section-header">
                <h2>Installation Setup</h2>
                <p className="section-subtext">Configure your install directory and preferences</p>
              </div>
              
              {/* Path Selector */}
              <div className="form-group">
                <div className="label-row">
                  <label>Install Location</label>
                  <span className="storage-info">
                    <HardDrive size={12} /> ~350 MB Required
                  </span>
                </div>
                <div className="path-input-wrapper">
                  <input 
                    type="text" 
                    value={installPath} 
                    readOnly 
                    title={installPath}
                  />
                  <button 
                    onClick={handleSelectDir} 
                    className="browse-btn"
                    title="Browse Folder"
                  >
                    <FolderOpen size={16} />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              {/* Options Group */}
              <div className="options-container">
                <div className="label-row">
                  <label>Preferences</label>
                </div>

                {/* Option 1: Desktop Shortcut */}
                <div 
                  className={`option-card ${createShortcut ? 'active' : ''}`}
                  onClick={() => setCreateShortcut(!createShortcut)}
                  role="checkbox"
                  aria-checked={createShortcut}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setCreateShortcut(!createShortcut)}
                >
                  <div className="option-checkbox">
                    {createShortcut && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="option-text-group">
                    <div className="option-title">Create Desktop Shortcut</div>
                    <div className="option-desc">Add a quick-launch icon to your desktop</div>
                  </div>
                </div>

                {/* Option 2: Auto-Updates */}
                <div 
                  className={`option-card ${autoUpdate ? 'active' : ''}`}
                  onClick={() => setAutoUpdate(!autoUpdate)}
                  role="checkbox"
                  aria-checked={autoUpdate}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setAutoUpdate(!autoUpdate)}
                >
                  <div className="option-checkbox">
                    {autoUpdate && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="option-text-group">
                    <div className="option-title">Enable Auto-Updates</div>
                    <div className="option-desc">Automatically receive newest visual presets & engine updates</div>
                  </div>
                </div>
              </div>

              {/* Install Action Button */}
              <div className="action-area">
                <button className="cyber-btn primary install-cta" onClick={handleInstall}>
                  <span>Install AuraWave 3D</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {mode === 'install' && installing && !installedPath && (
            <div className="progress-screen slide-in">
              <div className="progress-header">
                <h2>{status.startsWith('Install failed') ? 'Installation Error' : 'Installing AuraWave 3D'}</h2>
                <p className="progress-sub">
                  {status.startsWith('Install failed') 
                    ? 'An error occurred during extraction' 
                    : 'Setting up files, audio drivers, and shaders...'}
                </p>
              </div>

              {/* Animated Equalizer Waves */}
              {!status.startsWith('Install failed') && (
                <div className="audio-eq-bars">
                  <span className="eq-bar b1"></span>
                  <span className="eq-bar b2"></span>
                  <span className="eq-bar b3"></span>
                  <span className="eq-bar b4"></span>
                  <span className="eq-bar b5"></span>
                  <span className="eq-bar b6"></span>
                  <span className="eq-bar b7"></span>
                </div>
              )}

              <div className="progress-bar-container">
                <div 
                  className={`progress-bar-fill ${status.startsWith('Install failed') ? 'error' : ''}`} 
                  style={{ width: `${progress}%` }}
                >
                  <div className="progress-glow-head"></div>
                </div>
              </div>

              <div className="progress-status-row">
                <span className="status-text">{status}</span>
                <span className="percent-text">{progress}%</span>
              </div>

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

          {mode === 'install' && installedPath && (
            <div className="success-screen slide-in">
              <div className="success-badge-wrapper">
                <div className="success-badge-pulse"></div>
                <div className="success-icon">
                  <Check size={36} strokeWidth={3} />
                </div>
              </div>
              
              <h2>Ready to Launch</h2>
              <p className="success-desc">
                AuraWave 3D has been successfully installed and is ready to ignite your audio visuals.
              </p>

              <div className="installed-info-card">
                <span className="info-label">Installed Directory:</span>
                <span className="info-val">{installPath}</span>
              </div>

              <div className="action-area">
                <button className="cyber-btn primary launch-btn" onClick={handleLaunch}>
                  <Play size={18} fill="currentColor" />
                  <span>Launch AuraWave 3D</span>
                  <ChevronRight size={18}/>
                </button>
              </div>
            </div>
          )}

          {mode === 'uninstall' && !installing && !installedPath && (
            <div className="setup-form slide-in">
              <div className="uninstall-hero">
                <div className="uninstall-warning-badge">
                  <AlertTriangle size={36} color="#ff3366" />
                </div>
                <h2>Uninstall AuraWave 3D</h2>
                <p className="uninstall-sub">
                  This will remove the application, desktop shortcuts, and configuration data from your computer.
                </p>
              </div>

              <div className="uninstall-info-box">
                <div className="info-row">
                  <span className="label">Target Directory:</span>
                  <span className="value">{installPath || 'AuraWave 3D Directory'}</span>
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

          {mode === 'uninstall' && installing && !installedPath && (
            <div className="progress-screen slide-in">
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

          {mode === 'uninstall' && installedPath && (
            <div className="success-screen slide-in">
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
      </div>
    </div>
  );
}

export default App;

