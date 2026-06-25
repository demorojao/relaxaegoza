'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ButtonVariant = 
  | 'gold' 
  | 'wine' 
  | 'outline-gold' 
  | 'outline-wine' 
  | 'ghost' 
  | 'glass-gold' 
  | 'glass-wine'
  | 'dark';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

// Extend HTMLMotionProps<'button'> to allow typical HTML button props and Framer Motion props
export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'gold', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tracking-wide text-center';
    
    const variantStyles = {
      gold: 'bg-gradient-to-r from-gold-primary to-gold-dark text-dark-bg hover:brightness-110 active:brightness-95 border border-gold-primary/20 shadow-[0_0_15px_rgba(197,168,128,0.15)] focus:ring-gold-primary/50',
      wine: 'bg-gradient-to-r from-wine-primary to-wine-dark text-white hover:brightness-110 active:brightness-95 border border-wine-primary/20 shadow-[0_0_15px_rgba(155,44,44,0.15)] focus:ring-wine-primary/50',
      'outline-gold': 'border border-gold-primary/30 text-gold-primary hover:bg-gold-primary/10 active:bg-gold-primary/20 focus:ring-gold-primary/50',
      'outline-wine': 'border border-wine-primary/30 text-wine-primary hover:bg-wine-primary/10 active:bg-wine-primary/20 focus:ring-wine-primary/50',
      ghost: 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 focus:ring-white/20',
      'glass-gold': 'glass-effect-gold text-gold-light hover:bg-gold-primary/15 active:bg-gold-primary/25 border border-gold-primary/20 shadow-[0_0_20px_rgba(197,168,128,0.08)] focus:ring-gold-primary/40',
      'glass-wine': 'glass-effect-wine text-wine-light hover:bg-wine-primary/15 active:bg-wine-primary/25 border border-wine-primary/20 shadow-[0_0_20px_rgba(155,44,44,0.08)] focus:ring-wine-primary/40',
      dark: 'bg-dark-card border border-dark-border text-gray-200 hover:bg-white/5 hover:border-gray-700 active:bg-white/10 focus:ring-gray-700',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-xs gap-1.5 rounded-lg',
      md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
      lg: 'px-7 py-3.5 text-base gap-2.5 rounded-xl',
      icon: 'h-10 w-10 p-0 rounded-xl',
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Carregando...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
