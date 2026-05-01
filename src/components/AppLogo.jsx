import React from 'react';

export default function AppLogo({ size = 28, className = "" }) {
  const height = size;
  const width = (size * 160) / 100;
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 160 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Envelope (long rectangle) */}
      <rect x="5" y="20" width="150" height="60" rx="12" fill="var(--text-primary)" stroke="var(--border)" strokeWidth="2" />
      
      {/* Shipping Label */}
      <rect x="20" y="30" width="60" height="40" rx="6" fill="var(--bg-secondary)" />
      
      {/* Label detail lines */}
      <line x1="28" y1="40" x2="70" y2="40" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="48" x2="65" y2="48" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="56" x2="55" y2="56" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      
      {/* Barcode-style lines */}
      <line x1="28" y1="62" x2="28" y2="68" stroke="#6b7280" strokeWidth="1" />
      <line x1="32" y1="62" x2="32" y2="68" stroke="#6b7280" strokeWidth="1" />
      <line x1="36" y1="62" x2="36" y2="68" stroke="#6b7280" strokeWidth="1" />
      <line x1="40" y1="62" x2="40" y2="68" stroke="#6b7280" strokeWidth="1" />
      <line x1="44" y1="62" x2="44" y2="68" stroke="#6b7280" strokeWidth="1" />
      
      {/* Small checkmark */}
      <path d="M110 60 L118 68 L135 50" fill="none" stroke="var(--success)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
