import React from 'react';

interface FitProLogoProps {
  size?: number;
  className?: string;
  color?: string;
  withGradient?: boolean;
}

const FitProLogo: React.FC<FitProLogoProps> = ({
  size = 32,
  className = '',
  color = '#ffffff',
  withGradient = false,
}) => {
  const id = `fp-grad-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {withGradient && (
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      )}

      {/* ── Flexed arm ── bold, geometric, reads at any size */}
      <path
        d={[
          // Forearm bottom-left going up
          'M22 72',
          'C18 68, 16 62, 18 56',
          'L22 46',
          // Up the inner arm to the bicep peak
          'C24 40, 26 36, 28 32',
          'L30 28',
          'C32 24, 35 20, 38 18',
          // Bicep peak curve (top of the arm)
          'C42 15, 48 14, 52 16',
          // Down to the fist area
          'C56 18, 58 22, 60 26',
          'L62 30',
          // Fist
          'C65 32, 68 32, 70 30',
          'C72 28, 76 28, 78 30',
          'C80 32, 80 36, 78 38',
          'C76 40, 72 40, 68 38',
          // Down the outer forearm
          'L64 36',
          'C62 40, 58 44, 56 48',
          'L52 56',
          'C48 62, 42 68, 36 72',
          // Close back to start
          'C32 74, 26 74, 22 72',
          'Z',
        ].join(' ')}
        fill={withGradient ? `url(#${id})` : color}
        opacity="0.2"
      />
      <path
        d={[
          'M22 72',
          'C18 68, 16 62, 18 56',
          'L22 46',
          'C24 40, 26 36, 28 32',
          'L30 28',
          'C32 24, 35 20, 38 18',
          'C42 15, 48 14, 52 16',
          'C56 18, 58 22, 60 26',
          'L62 30',
          'C65 32, 68 32, 70 30',
          'C72 28, 76 28, 78 30',
          'C80 32, 80 36, 78 38',
          'C76 40, 72 40, 68 38',
          'L64 36',
          'C62 40, 58 44, 56 48',
          'L52 56',
          'C48 62, 42 68, 36 72',
          'C32 74, 26 74, 22 72',
          'Z',
        ].join(' ')}
        stroke={withGradient ? `url(#${id})` : color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Clock circle on the bicep ── */}
      <circle
        cx="42"
        cy="30"
        r="13"
        stroke={withGradient ? `url(#${id})` : color}
        strokeWidth="3"
        fill="none"
      />

      {/* Hour hand → pointing ~2 o'clock */}
      <line
        x1="42" y1="30"
        x2="48" y2="23"
        stroke={withGradient ? `url(#${id})` : color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Minute hand → pointing ~12 o'clock */}
      <line
        x1="42" y1="30"
        x2="42" y2="19"
        stroke={withGradient ? `url(#${id})` : color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx="42" cy="30" r="2" fill={withGradient ? `url(#${id})` : color} />

      {/* 4 tick marks (12, 3, 6, 9 o'clock) */}
      <line x1="42" y1="18" x2="42" y2="20" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="30" x2="52" y2="30" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="42" x2="42" y2="40" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="30" x2="32" y2="30" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2" strokeLinecap="round" />

      {/* ── Energy rays near the fist ── */}
      <line x1="72" y1="26" x2="78" y2="22" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <line x1="74" y1="32" x2="80" y2="32" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <line x1="72" y1="38" x2="78" y2="42" stroke={withGradient ? `url(#${id})` : color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
};

export default FitProLogo;
