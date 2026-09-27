import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldAlert, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WelcomeLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'police') navigate('/police/dashboard');
      else navigate('/user/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#090D14] text-[#F7FAFC] flex flex-col items-center justify-center overflow-hidden px-4 select-none">
      {/* Dark Cyber Mesh Background & Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-[#883A2E]/30 to-[#D65A31]/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tl from-[#3182CE]/20 to-[#883A2E]/20 blur-[120px] pointer-events-none" />

      {/* Main Centered Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center space-y-8 py-12">
        
        {/* 1. Animated Crime Data Analytics SVG Logo */}
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#D65A31]/30 via-[#883A2E]/40 to-[#3182CE]/30 blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
          
          <svg
            viewBox="0 0 400 400"
            className="w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80 drop-shadow-[0_0_40px_rgba(214,90,49,0.35)] transition-transform duration-500 hover:scale-[1.03]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="shieldGrad" x1="50" y1="20" x2="350" y2="380" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#D65A31" />
                <stop offset="50%" stopColor="#883A2E" />
                <stop offset="100%" stopColor="#1A0A06" />
              </linearGradient>

              <linearGradient id="lensGrad" x1="160" y1="140" x2="260" y2="240" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#63B3ED" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3182CE" stopOpacity="0.08" />
              </linearGradient>

              <linearGradient id="barGrad1" x1="0" y1="260" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#883A2E" />
                <stop offset="100%" stopColor="#D65A31" />
              </linearGradient>

              <linearGradient id="barGrad2" x1="0" y1="260" x2="0" y2="140" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#D65A31" />
                <stop offset="100%" stopColor="#F6AD55" />
              </linearGradient>

              <linearGradient id="barGrad3" x1="0" y1="260" x2="0" y2="160" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3182CE" />
                <stop offset="100%" stopColor="#63B3ED" />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <style>{`
              @keyframes pulseHotspot {
                0%, 100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.6); opacity: 0.2; }
              }
              @keyframes moveLens {
                0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
                50% { transform: translate(5px, -7px) rotate(3deg); }
              }
              @keyframes dashConnect {
                to { stroke-dashoffset: -40; }
              }
              @keyframes nodeGlow {
                0%, 100% { r: 5; opacity: 0.8; }
                50% { r: 7; opacity: 1; filter: drop-shadow(0 0 8px #F6AD55); }
              }
              @keyframes silhouettePulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 0.98; }
              }
              .hotspot-ring {
                transform-origin: 270px 130px;
                animation: pulseHotspot 2.5s infinite ease-in-out;
              }
              .magnifier-group {
                transform-origin: 210px 190px;
                animation: moveLens 5.5s infinite ease-in-out;
              }
              .data-line-animated {
                stroke-dasharray: 6 6;
                animation: dashConnect 3s linear infinite;
              }
              .glowing-node-1 { animation: nodeGlow 2.2s infinite ease-in-out 0s; }
              .glowing-node-2 { animation: nodeGlow 2.2s infinite ease-in-out 0.7s; }
              .glowing-node-3 { animation: nodeGlow 2.2s infinite ease-in-out 1.4s; }
              .silhouette-art { animation: silhouettePulse 4s infinite ease-in-out; }
            `}</style>

            {/* Outer Cyber Shield Frame */}
            <path
              d="M 200,24 L 330,90 L 330,240 L 200,376 L 70,240 L 70,90 Z"
              fill="#0F141C"
              fillOpacity="0.9"
              stroke="url(#shieldGrad)"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Inner Tech Grid lines */}
            <path
              d="M 120,90 H 280 M 100,150 H 300 M 100,210 H 300 M 120,270 H 280"
              stroke="#D65A31"
              strokeOpacity="0.15"
              strokeWidth="1.5"
            />
            <path
              d="M 150,70 V 310 M 200,50 V 350 M 250,70 V 310"
              stroke="#D65A31"
              strokeOpacity="0.15"
              strokeWidth="1.5"
            />

            {/* 1. DATA ANALYTICS BARS */}
            <g opacity="0.85">
              <rect x="110" y="200" width="16" height="60" rx="3" fill="url(#barGrad1)" />
              <rect x="134" y="160" width="16" height="100" rx="3" fill="url(#barGrad2)" />
              <rect x="158" y="180" width="16" height="80" rx="3" fill="url(#barGrad3)" />
            </g>

            {/* 2. HUMAN SILHOUETTE / SHADOW PROFILE */}
            <g className="silhouette-art" opacity="0.85">
              <circle cx="210" cy="155" r="22" fill="#CBD5E0" />
              <path
                d="M 170,225 C 170,192 185,182 210,182 C 235,182 250,192 250,225 V 250 H 170 Z"
                fill="#CBD5E0"
              />
              <circle cx="210" cy="155" r="22" stroke="#883A2E" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
            </g>

            {/* 3. CONNECTED DATA POINTS / ANALYTICS NODES */}
            <path
              d="M 122,160 L 190,120 L 270,130 L 240,240 L 166,220"
              stroke="#F6AD55"
              strokeWidth="2.2"
              fill="none"
              className="data-line-animated"
            />

            <circle cx="122" cy="160" r="5" fill="#F6AD55" className="glowing-node-1" />
            <circle cx="190" cy="120" r="5" fill="#63B3ED" className="glowing-node-2" />
            <circle cx="240" cy="240" r="5" fill="#D65A31" className="glowing-node-3" />

            {/* 4. CRIME HOTSPOT MAP LOCATION PIN & PULSING RADAR */}
            <g transform="translate(270, 130)">
              <circle cx="0" cy="0" r="16" fill="none" stroke="#E53E3E" strokeWidth="2" className="hotspot-ring" />
              <path
                d="M 0,-16 C -7,-16 -12,-11 -12,-4 C -12,5 0,16 0,16 C 0,16 12,5 12,-4 C 12,-11 7,-16 0,-16 Z"
                fill="#E53E3E"
                filter="url(#glow)"
              />
              <circle cx="0" cy="-4" r="4" fill="#FFFFFF" />
            </g>

            {/* 5. MAGNIFYING GLASS / ANALYTICS INVESTIGATION LENS */}
            <g className="magnifier-group">
              <circle
                cx="200"
                cy="190"
                r="44"
                fill="url(#lensGrad)"
                stroke="#63B3ED"
                strokeWidth="3.5"
                filter="url(#glow)"
              />
              <path
                d="M 170,172 A 34 34 0 0 1 218,158"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.6"
              />
              <line x1="170" y1="190" x2="230" y2="190" stroke="#63B3ED" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
              <line x1="200" y1="160" x2="200" y2="220" stroke="#63B3ED" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
              <path
                d="M 232,222 L 275,265"
                stroke="#D65A31"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M 232,222 L 275,265"
                stroke="#F6AD55"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* 2. PROJECT BRANDING TITLE */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-widest bg-gradient-to-r from-[#FFFFFF] via-[#E2E8F0] to-[#D65A31] bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)] uppercase font-sans">
            CRIMELYTICS
          </h1>
          <div className="flex items-center justify-center space-x-3 text-xs sm:text-sm font-bold tracking-[0.35em] text-[#D65A31] uppercase">
            <span className="w-8 h-[1px] bg-[#D65A31]/50" />
            <span>CRIME DATA ANALYTICS</span>
            <span className="w-8 h-[1px] bg-[#D65A31]/50" />
          </div>
        </div>

        {/* 3. CENTERED ACTION BUTTONS */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={handleGetStarted}
            id="landing-enter-portal-btn"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#883A2E] via-[#D65A31] to-[#883A2E] bg-[length:200%_auto] text-white font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(214,90,49,0.4)] hover:shadow-[0_0_35px_rgba(214,90,49,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer border border-[#D65A31]/40"
          >
            <LogIn className="h-5 w-5" />
            <span>{user ? 'Enter Dashboard' : 'Enter Portal / Login'}</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <Link
            to="/emergency"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl border border-[#CBD5E0]/20 bg-[#1A202C]/60 text-xs font-semibold text-[#E2E8F0] hover:border-[#D65A31] hover:bg-[#2D3748]/80 transition-all backdrop-blur-md"
          >
            <ShieldAlert className="h-4 w-4 text-[#E53E3E]" />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
