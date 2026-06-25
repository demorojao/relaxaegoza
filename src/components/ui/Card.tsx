'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'gold' | 'wine' | 'glass' | 'glass-gold' | 'glass-wine';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  isInteractive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', isInteractive = false, children, ...props }, ref) => {
    
    const baseStyles = 'rounded-2xl border transition-all duration-300 overflow-hidden';
    
    const variantStyles = {
      default: 'bg-dark-card border-dark-border text-gray-200',
      gold: 'bg-dark-card border-gold-primary/20 text-gray-200 shadow-[0_0_30px_rgba(197,168,128,0.03)]',
      wine: 'bg-dark-card border-wine-primary/20 text-gray-200 shadow-[0_0_30px_rgba(155,44,44,0.03)]',
      glass: 'glass-effect text-gray-200',
      'glass-gold': 'glass-effect-gold text-gray-200 shadow-[0_0_40px_rgba(197,168,128,0.05)]',
      'glass-wine': 'glass-effect-wine text-gray-200 shadow-[0_0_40px_rgba(155,44,44,0.05)]',
    };

    const interactiveStyles = isInteractive 
      ? 'hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] cursor-pointer' 
      : '';

    return (
      <motion.div
        ref={ref}
        whileHover={isInteractive ? { y: -5, scale: 1.01 } : undefined}
        transition={isInteractive ? { type: 'spring', stiffness: 300, damping: 20 } : undefined}
        className={cn(baseStyles, variantStyles[variant], interactiveStyles, className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pb-4 border-b border-white/5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-4 border-t border-white/5 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}
