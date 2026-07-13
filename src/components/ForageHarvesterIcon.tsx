import React from 'react';

interface ForageHarvesterIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export function ForageHarvesterIcon({ className = "w-6 h-6", size, ...props }: ForageHarvesterIconProps) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className} 
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Curved discharge chute (Bica de descarga) */}
      <path d="M 60 80 Q 56 40, 75 18 Q 82 8, 95 8 L 97 16 Q 85 16, 81 26 Q 67 46, 68 80 Z" />
      {/* Gathering horns (Bicos colhedores) pointing down-left */}
      <path d="M 60 80 L 15 95 L 48 85 L 28 105 L 60 90 Z" />
      {/* Main body / rotor housing */}
      <rect x="52" y="74" width="18" height="16" rx="3" />
      {/* Drawbar / frame */}
      <path d="M 70 82 H 105 V 88 H 70 Z" />
      {/* Support jack / wheel */}
      <path d="M 98 88 V 98 H 102 V 88 Z" />
    </svg>
  );
}
