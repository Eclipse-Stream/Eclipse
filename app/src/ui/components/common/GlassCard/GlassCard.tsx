// GlassCard.tsx - Glassmorphism card component (Story 1.5, Task 2)
// Implements AC#1 glassmorphism effect with hover states

import { ReactNode } from 'react';

type CardSize = 'sm' | 'default' | 'lg';

interface GlassCardProps {
  children: ReactNode;
  size?: CardSize;
  className?: string;
}

const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  default: 'p-6',
  lg: 'p-8',
};

export function GlassCard({ children, size = 'default', className = '' }: GlassCardProps) {
  return (
    <div
      className={`
        relative rounded-[16px] border border-white/[0.04]
        bg-[rgba(15,15,15,0.6)] backdrop-blur-[20px]
        transition-all duration-200
        hover:border-[#fbbf24]/20
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default GlassCard;
