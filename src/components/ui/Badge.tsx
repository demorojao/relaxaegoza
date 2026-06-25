import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 
  | 'gold' 
  | 'wine' 
  | 'emerald' 
  | 'glass-gold' 
  | 'glass-wine' 
  | 'glass-emerald'
  | 'outline' 
  | 'secondary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  isPulsing?: boolean;
}

export function Badge({ children, variant = 'outline', className, isPulsing = false }: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300';
  
  const variantStyles = {
    gold: 'bg-gradient-to-r from-gold-primary to-gold-dark text-dark-bg border border-gold-primary/20 shadow-[0_0_8px_rgba(197,168,128,0.2)]',
    wine: 'bg-gradient-to-r from-wine-primary to-wine-dark text-white border border-wine-primary/20 shadow-[0_0_8px_rgba(155,44,44,0.2)]',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-white border border-emerald-600/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    'glass-gold': 'glass-effect-gold text-gold-light border border-gold-primary/30 shadow-[0_0_10px_rgba(197,168,128,0.1)]',
    'glass-wine': 'glass-effect-wine text-wine-light border border-wine-primary/30 shadow-[0_0_10px_rgba(155,44,44,0.1)]',
    'glass-emerald': 'bg-emerald-950/40 backdrop-blur-md text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    outline: 'border border-white/10 text-gray-400 hover:text-white hover:border-white/20',
    secondary: 'bg-white/5 border border-white/5 text-gray-300',
  };

  return (
    <span 
      className={cn(
        baseStyles, 
        variantStyles[variant], 
        isPulsing && 'animate-pulse ring-1 ring-offset-0 ring-current/20',
        className
      )}
    >
      {isPulsing && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  );
}
