import React from 'react';

export default function AppLogo({ size = 28, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <rect 
        x="6" 
        y="8" 
        width="20" 
        height="16" 
        rx="3" 
        stroke="var(--accent)" 
        strokeWidth="2.5" 
        fill="var(--accent)" 
        fillOpacity="0.1" 
      />
      <path 
        d="M10 13H22M10 17H22M10 21H16" 
        stroke="var(--accent)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      <rect 
        x="24" 
        y="12" 
        width="4" 
        height="8" 
        rx="1" 
        fill="var(--accent)" 
      />
    </svg>
  );
}
