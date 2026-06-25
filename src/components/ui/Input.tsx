import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  themeVariant?: 'gold' | 'wine';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, themeVariant = 'gold', ...props }, ref) => {
    
    const inputBorderColor = error 
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
      : themeVariant === 'gold'
        ? 'border-white/5 focus:border-gold-primary/40 focus:ring-gold-primary/10'
        : 'border-white/5 focus:border-wine-primary/40 focus:ring-wine-primary/10';

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-gray-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full bg-black/40 border text-sm text-gray-200 placeholder-gray-600 rounded-xl py-3 px-4 focus:outline-none focus:ring-4 transition-all duration-300',
              leftIcon ? 'pl-11' : '',
              rightIcon ? 'pr-11' : '',
              inputBorderColor,
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-red-400 font-medium mt-0.5 animate-fadeIn">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-xs text-gray-500 mt-0.5">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
