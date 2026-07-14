'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Custom Peach Icon to avoid lucide-react version mismatches
function Peach(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Peach body */}
      <path d="M12 20.66C8.05 21.9 4 18.9 4 14.5 4 10.08 7.58 6.5 12 6.5s8 3.58 8 8c0 4.4-4.05 7.4-8 6.16z" />
      {/* Crease */}
      <path d="M12 6.5c-0.8 2.2-0.8 5 0 7.5" />
      {/* Leaf */}
      <path d="M12 6.5c1.5-2 3.5-2.5 5.5-2.5-1 2-2 4-5.5 4.5" />
      {/* Stem */}
      <path d="M12 6.5V3" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 sm:gap-2.5 shrink-0 group select-none", className)}>
      <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-gold-primary/20 via-wine-primary/20 to-black border border-gold-primary/30 group-hover:border-gold-primary/70 transition-all duration-300 shadow-[0_0_15px_rgba(197,168,128,0.15)] group-hover:shadow-[0_0_20px_rgba(197,168,128,0.3)]">
        {/* Glow behind the icon */}
        <div className="absolute inset-0 bg-gold-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
        <Peach className="w-4 h-4 sm:w-5 sm:h-5 text-gold-primary group-hover:text-gold-light group-hover:scale-110 transition-all duration-300 relative z-10" />
      </div>
      <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white transition-colors">
        Relaxe<span className="font-serif text-gold-primary group-hover:text-gold-light transition-colors"> & </span>Goze
      </span>
    </Link>
  );
}
