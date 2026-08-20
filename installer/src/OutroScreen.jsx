import { useEffect, useState } from 'react';
import './index.css';


export default function OutroScreen() {
  const [stage, setStage] = useState(1);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Stage progression over 3.5s
    const t1 = setTimeout(() => setStage(2), 1200);
    const t2 = setTimeout(() => setStage(3), 2400);
    
    const t3 = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        window.electronAPI?.outroComplete();
      }, 400);
    }, 3450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className={`outro-viewport ${isFading ? 'outro-exit' : ''}`}>
      {/* Ethereal Ambient Background Aura */}
      <div className={`outro-ambient-aura stage-${stage}`}></div>

      {/* Gentle Orbital Rings */}
      <div className="outro-orbital-ring ring-1"></div>
      <div className="outro-orbital-ring ring-2"></div>

      {/* Floating Ascending Particles */}
      <div className="outro-particles-container">
        <span className="op-dot op1"></span>
        <span className="op-dot op2"></span>
        <span className="op-dot op3"></span>
        <span className="op-dot op4"></span>
        <span className="op-dot op5"></span>
        <span className="op-dot op6"></span>
      </div>

      {/* Central Farewell Emblem */}
      <div className="outro-emblem-wrapper">
        <div className="outro-emblem-glow"></div>
        <svg viewBox="0 0 120 120" className="outro-emblem-svg">
          <defs>
            <linearGradient id="outroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#ff4655" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="outroGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Gentle Harmonic Waveform */}
          <path
            d="M20 60 Q35 40 50 60 T80 60 T100 60"
            fill="none"
            stroke="url(#outroGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#outroGlow)"
            className="outro-wave"
          />
          <circle cx="60" cy="60" r="18" fill="rgba(10, 12, 18, 0.9)" stroke="url(#outroGrad)" strokeWidth="3" />
          <circle cx="60" cy="60" r="7" fill="#00f0ff" className="outro-core-pulse" />
        </svg>
      </div>

      {/* Cinematic Farewell Typography */}
      <div className="outro-typography">
        <h1 className="outro-title">See You Soon.</h1>
        <div className="outro-status-pill">
          <span className="outro-status-dot"></span>
          <span>AuraWave 3D Uninstalled Successfully</span>
        </div>
      </div>
    </div>
  );
}
