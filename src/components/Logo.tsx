'use client';

import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 sm:gap-2.5 shrink-0 group select-none", className)}>
      <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-gold-primary/20 via-wine-primary/20 to-black border border-gold-primary/30 group-hover:border-gold-primary/70 transition-all duration-300 shadow-[0_0_15px_rgba(197,168,128,0.15)] group-hover:shadow-[0_0_20px_rgba(197,168,128,0.3)]">
        {/* Glow behind the icon */}
        <div className="absolute inset-0 bg-gold-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-gold-primary group-hover:text-gold-light group-hover:scale-110 transition-all duration-300 relative z-10" />
      </div>
      <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white transition-colors">
        Relaxa<span className="font-serif text-gold-primary group-hover:text-gold-light transition-colors"> & </span>Goza
      </span>
    </Link>
  );
}
