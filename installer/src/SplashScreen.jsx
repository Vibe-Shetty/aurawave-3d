import { useEffect, useState } from 'react';
import './index.css';


export default function SplashScreen() {
  const [stage, setStage] = useState(1); // 1: Genesis, 2: Waveform Surge, 3: Engine Ready
  const [statusText, setStatusText] = useState('CALIBRATING AUDIO MATRIX...');
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Stage 1 -> 2 at 1.1s
    const t1 = setTimeout(() => {
      setStage(2);
      setStatusText('INITIALIZING REAL-TIME 3D SHADERS...');
    }, 1100);

    // Stage 2 -> 3 at 2.3s
    const t2 = setTimeout(() => {
      setStage(3);
      setStatusText('AURA ENGINE READY');
    }, 2300);

    // Fade out and transition at 3.5s
    const t3 = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        window.electronAPI?.splashComplete();
      }, 350);
    }, 3450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className={`splash-viewport ${isFading ? 'splash-exit' : ''}`}>
      {/* Dynamic Ambient Background Glow */}
      <div className={`splash-ambient-aura stage-${stage}`}></div>

      {/* Orbital Rotating Tech Rings */}
      <div className="orbital-ring orbital-1"></div>
      <div className="orbital-ring orbital-2"></div>
      <div className="orbital-ring orbital-3"></div>

      {/* Concentric Expanding Shockwaves */}
      <div className="shockwave-ring ring-1"></div>
      <div className="shockwave-ring ring-2"></div>
      <div className="shockwave-ring ring-3"></div>
      {stage >= 2 && <div className="shockwave-ring ring-4"></div>}

      {/* Floating Burst Particles */}
      <div className="particles-container">
        <span className="p-dot p1"></span>
        <span className="p-dot p2"></span>
        <span className="p-dot p3"></span>
        <span className="p-dot p4"></span>
        <span className="p-dot p5"></span>
        <span className="p-dot p6"></span>
        <span className="p-dot p7"></span>
        <span className="p-dot p8"></span>
      </div>

      {/* Central Holographic Emblem */}
      <div className={`splash-emblem-wrapper stage-${stage}`}>
        <div className="emblem-backdrop-glow"></div>
        <div className="emblem-core">
          <svg viewBox="0 0 120 120" className="emblem-svg">
            <defs>
              <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#ff4655" />
                <stop offset="100%" stopColor="#ff2037" />
              </linearGradient>
              <linearGradient id="cyanNeon" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="100%" stopColor="#7000ff" />
              </linearGradient>
              <filter id="splashGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Rotating Tech HUD Brackets */}
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0, 240, 255, 0.25)" strokeWidth="1.5" strokeDasharray="15 35" className="hud-rot-ccw" />
            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255, 70, 85, 0.3)" strokeWidth="1.5" strokeDasharray="30 20" className="hud-rot-cw" />

            {/* Futuristic Sound Waveform Wings */}
            <path
              d="M18 60 Q32 30 46 60 T74 60 T102 60"
              fill="none"
              stroke="url(#splashGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#splashGlow)"
              className="wave-path"
            />
            
            {/* Secondary Resonance Wave */}
            <path
              d="M26 60 Q40 42 52 60 T78 60 T94 60"
              fill="none"
              stroke="url(#cyanNeon)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
              className="wave-path-sub"
            />

            {/* Central Core Reactor */}
            <circle cx="60" cy="60" r="20" fill="rgba(8, 10, 15, 0.95)" stroke="url(#splashGrad)" strokeWidth="3.5" />
            <circle cx="60" cy="60" r="9" fill="#00f0ff" className="core-pulse" />
            <circle cx="60" cy="60" r="4" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Live Equalizer Surge Bars */}
      <div className="splash-eq-visualizer">
        <span className="s-bar s1"></span>
        <span className="s-bar s2"></span>
        <span className="s-bar s3"></span>
        <span className="s-bar s4"></span>
        <span className="s-bar s5"></span>
        <span className="s-bar s6"></span>
        <span className="s-bar s7"></span>
        <span className="s-bar s8"></span>
        <span className="s-bar s9"></span>
      </div>

      {/* Typography */}
      <div className="splash-typography">
        <div className="splash-title-row">
          <h1 className="splash-title">AuraWave<span>3D</span></h1>
        </div>
        
        {/* Dynamic Status Ticker */}
        <div className="splash-status-ticker">
          <span className={`status-led stage-${stage}`}></span>
          <span className="status-message">{statusText}</span>
          <span className="status-version">v1.3.0</span>
        </div>
      </div>
    </div>
  );
}
