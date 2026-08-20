import { useState, useEffect } from 'react';
import { FolderOpen, X, Minus, Check, ChevronRight } from 'lucide-react';
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
  const [showFadeOut, setShowFadeOut] = useState(false);

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
        <div className="drag-region">AuraWave 3D {mode === 'uninstall' ? 'Uninstaller' : 'Setup'}</div>
        <div className="window-controls">
          <button onClick={() => window.electronAPI?.windowMinimize()}><Minus size={16}/></button>
          <button onClick={() => window.electronAPI?.windowClose()} className="close-btn"><X size={16}/></button>
        </div>
      </div>

      <div className={`installer-content ${showFadeOut ? 'fade-out' : ''}`}>
        {/* Left Panel - Branding */}
        <div className="left-panel">
          <div className="branding">
            <h1>AuraWave</h1>
            <p>Next-Gen Audio-Reactive 3D Environments</p>
          </div>
          <div className="mascot-placeholder">
            <video 
              src="./A_high_quality_D_animation_of.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="mascot-video"
            />
          </div>
        </div>

        {/* Right Panel - Setup */}
        <div className="right-panel">
          
          {mode === 'install' && !installing && !installedPath && (
            <div className="setup-form slide-in">
              <h2>Installation</h2>
              
              <div className="form-group">
                <label>INSTALL PATH</label>
                <div className="path-input-wrapper">
                  <input type="text" value={installPath} readOnly />
                  <button onClick={handleSelectDir} className="icon-btn">
                    <FolderOpen size={18} />
                  </button>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="cyber-checkbox">
                  <input 
                    type="checkbox" 
                    checked={createShortcut} 
                    onChange={(e) => setCreateShortcut(e.target.checked)} 
                  />
                  <span className="checkmark"><Check size={14} /></span>
                  Create Desktop Shortcut
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="cyber-checkbox">
                  <input 
                    type="checkbox" 
                    checked={autoUpdate} 
                    onChange={(e) => setAutoUpdate(e.target.checked)} 
                  />
                  <span className="checkmark"><Check size={14} /></span>
                  Enable Auto-Updates
                </label>
              </div>

              <div className="action-area">
                <button className="cyber-btn primary" onClick={handleInstall}>
                  Install
                </button>
              </div>
            </div>
          )}

          {mode === 'install' && installing && !installedPath && (
            <div className="progress-screen slide-in">
              <h2>{status.startsWith('Install') ? 'Error' : 'Installing AuraWave 3D'}</h2>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: status.startsWith('Install') ? '#ff3333' : '#0ff'
                  }}>
                </div>
              </div>
              <p className="status-text">{status}</p>
              {status.startsWith('Install') && (
                <div className="action-area" style={{ marginTop: '20px' }}>
                  <button className="cyber-btn primary" onClick={handleRetry}>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'install' && installedPath && (
            <div className="success-screen slide-in">
              <div className="success-icon">
                <Check size={48} color="#0ff" />
              </div>
              <h2>Ready to Launch</h2>
              <p>AuraWave 3D has been successfully installed.</p>
              <div className="action-area">
                <button className="cyber-btn primary launch-btn" onClick={handleLaunch}>
                  Launch Now <ChevronRight size={18}/>
                </button>
              </div>
            </div>
          )}

          {mode === 'uninstall' && !installing && !installedPath && (
            <div className="setup-form slide-in" style={{ justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <X size={64} color="#ff3333" style={{ marginBottom: '20px' }} />
                <h2>Uninstall AuraWave 3D</h2>
                <p style={{ color: '#888', marginTop: '10px' }}>
                  This will remove the application, shortcuts, and all associated registry keys from your computer.
                </p>
              </div>
              <div className="action-area" style={{ justifyContent: 'center' }}>
                <button className="cyber-btn primary" style={{ background: '#ff3333', borderColor: '#ff3333', color: '#ffffff', boxShadow: '0 0 15px rgba(255, 51, 51, 0.4)' }} 
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
                  }}>
                  Confirm Uninstall
                </button>
              </div>
            </div>
          )}

          {mode === 'uninstall' && installing && !installedPath && (
            <div className="progress-screen slide-in">
              <h2>{status.startsWith('Uninstall failed') ? 'Error' : 'Uninstalling AuraWave 3D'}</h2>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: status.startsWith('Uninstall failed') ? '#ff3333' : '#ff3333'
                  }}>
                </div>
              </div>
              <p className="status-text">{status}</p>
              {status.startsWith('Uninstall failed') && (
                <div className="action-area" style={{ marginTop: '20px' }}>
                  <button className="cyber-btn primary" onClick={handleRetry}>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'uninstall' && installedPath && (
            <div className="success-screen slide-in">
              {!showFadeOut ? (
                <>
                  <div className="success-icon" style={{ borderColor: '#ff3333' }}>
                    <Check size={48} color="#ff3333" />
                  </div>
                  <h2>Uninstalled</h2>
                  <p>AuraWave 3D has been completely removed.</p>
                  <div className="action-area">
                    <button className="cyber-btn primary" onClick={() => {
                      setShowFadeOut(true);
                      setTimeout(() => {
                        window.electronAPI?.windowClose();
                      }, 2000);
                    }}>
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="fade-out-message slide-in">
                  <h2 style={{ fontSize: '36px', color: '#fff', textShadow: '0 0 20px #0ff', opacity: 0.8 }}>See You Soon.</h2>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
