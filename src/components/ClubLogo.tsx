import React, { useState } from 'react';
import clubLogoImg from '../assets/images/wednesday_united_logo_1791458085507.jpg';

interface ClubLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showRing?: boolean;
}

export const ClubLogo: React.FC<ClubLogoProps> = ({
  className = '',
  size = 'md',
  showRing = true,
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const ringClass = showRing
    ? 'ring-2 ring-orange-500/80 shadow-md shadow-blue-900/20'
    : '';

  if (hasError) {
    // Beautiful vector circular badge fallback in Blue, Orange, and White
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white select-none ${sizeClasses} ${ringClass} ${className}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Ring */}
          <circle cx="50" cy="50" r="47" stroke="#EA580C" strokeWidth="4" />
          <circle cx="50" cy="50" r="43" fill="#1E3A8A" />
          <circle cx="50" cy="50" r="39" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Central Crest / Shield */}
          <path
            d="M50 18 L70 28 V52 C70 66 50 78 50 78 C50 78 30 66 30 52 V28 Z"
            fill="#0F172A"
            stroke="#EA580C"
            strokeWidth="2"
          />

          {/* Central Football Pattern */}
          <circle cx="50" cy="48" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
          {/* Soccer pentagon */}
          <polygon
            points="50,42 55,46 53,52 47,52 45,46"
            fill="#1E3A8A"
          />
          <line x1="50" y1="42" x2="50" y2="34" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="55" y1="46" x2="62" y2="44" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="53" y1="52" x2="58" y2="58" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="47" y1="52" x2="42" y2="58" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="45" y1="46" x2="38" y2="44" stroke="#0F172A" strokeWidth="1.2" />

          {/* Star Accents */}
          <polygon points="50,83 52,88 57,88 53,91 55,96 50,93 45,96 47,91 43,88 48,88" fill="#F97316" />

          {/* Top text */}
          <text
            x="50"
            y="14"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            letterSpacing="1"
          >
            WEDNESDAY
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden bg-blue-900 ${sizeClasses} ${ringClass} ${className}`}
    >
      <img
        src={clubLogoImg}
        alt="Wednesday United FC"
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== window.location.origin + '/logo.png') {
            target.src = '/logo.png';
          } else {
            setHasError(true);
          }
        }}
      />
    </div>
  );
};
