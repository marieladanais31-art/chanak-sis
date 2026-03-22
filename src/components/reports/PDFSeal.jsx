import React from 'react';

const PDFSeal = ({ type = 'standard', className = '' }) => {
  // Colors based on branding
  const primaryColor = '#0B2D5C'; // Navy
  const secondaryColor = '#2F80ED'; // Blue
  const goldColor = '#D4AF37'; // Optional accent

  if (type === 'stamp') {
    return (
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="60" cy="60" r="58" stroke={primaryColor} strokeWidth="2" />
        <circle cx="60" cy="60" r="55" stroke={primaryColor} strokeWidth="1" />
        <path
          id="textPath"
          d="M 30,60 A 30,30 0 0 1 90,60"
          transform="translate(0, 5)"
          fill="none"
        />
        <text fill={primaryColor} fontSize="8" fontWeight="bold" letterSpacing="1">
          <textPath href="#textPath" startOffset="50%" textAnchor="middle">
            OFFICIAL RECORD
          </textPath>
        </text>
        <text
          x="60"
          y="65"
          fill={primaryColor}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
        >
          CHANAK
        </text>
        <text
          x="60"
          y="75"
          fill={primaryColor}
          fontSize="6"
          textAnchor="middle"
        >
          FL PRIVATE SCHOOL #134620
        </text>
        <circle cx="60" cy="60" r="45" stroke={primaryColor} strokeWidth="0.5" strokeDasharray="2 2" />
      </svg>
    );
  }

  // Standard or Monochromatic
  const mainFill = type === 'monochromatic' ? primaryColor : primaryColor;
  const accentFill = type === 'monochromatic' ? primaryColor : secondaryColor;

  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Ring */}
      <circle cx="50" cy="50" r="48" stroke={mainFill} strokeWidth="2" />
      
      {/* Inner Decorative Ring */}
      <circle cx="50" cy="50" r="42" stroke={accentFill} strokeWidth="1" strokeDasharray="4 2" />

      {/* Center Background */}
      <circle cx="50" cy="50" r="35" fill="white" />

      {/* Text Arc - Official Record */}
      <path
        id="curveTop"
        d="M 20,50 A 30,30 0 0 1 80,50"
        fill="none"
      />
      <text fill={mainFill} fontSize="7" fontWeight="bold" letterSpacing="1.2">
        <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
          OFFICIAL RECORD
        </textPath>
      </text>

      {/* Center Logo/Text */}
      <rect x="35" y="40" width="30" height="20" rx="2" fill={mainFill} opacity="0.1" />
      <text x="50" y="52" fill={mainFill} fontSize="10" fontWeight="bold" textAnchor="middle">
        CHANAK
      </text>
      <text x="50" y="62" fill={mainFill} fontSize="5" textAnchor="middle">
        INTL ACADEMY
      </text>

      {/* Bottom Text - School Code */}
      <path
        id="curveBottom"
        d="M 25,50 A 25,25 0 0 0 75,50"
        fill="none"
      />
      <text fill={accentFill} fontSize="5" fontWeight="medium" letterSpacing="0.5">
        <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
          CODE #134620
        </textPath>
      </text>
    </svg>
  );
};

export default PDFSeal;