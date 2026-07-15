import React from 'react';
import '../../styles/animated-loader.css';

const AnimatedLoaderCard = () => {
  return (
    <div className="loader-card-container">
      <div className="loader-card">
        
        {/* Left Side: Circular Loader and Logo */}
        <div className="loader-visual-wrapper">
          <div className="loader-glow"></div>
          <div className="loader-ring"></div>
          
          <div className="loader-logo-wrapper">
            {/* You can replace this SVG with your actual logo img tag: <img src="/logo.png" alt="Utah CNA" /> */}
            <svg 
              className="mock-logo" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20 20 H60 V50 H80 V80 H20 Z" fill="#1e3a8a" opacity="0.1" />
              <path d="M50 35 C50 35 35 25 35 45 C35 60 50 70 50 70 C50 70 65 60 65 45 C65 25 50 35 50 35 Z" fill="#ef4444" />
              <path d="M40 45 H45 V40 H55 V45 H60 V55 H55 V60 H45 V55 H40 Z" fill="white" />
              <path d="M50 70 C40 85 25 75 35 60" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Right Side: Text and Progress */}
        <div className="loader-content">
          <h2 className="loader-title">
            UTAH <span>CNA</span>
          </h2>
          <div className="loader-subtitle">
            TRAINING CENTERS
          </div>
          
          <div className="loader-status">
            Loading data...
            <div className="blinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          
          <div className="progress-track">
            <div className="progress-bar"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnimatedLoaderCard;
