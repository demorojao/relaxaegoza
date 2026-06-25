import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        className
      )}
      {...props}
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden aspect-[3/4] relative flex flex-col justify-end p-4 gap-3">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 bg-white/[0.02]" />
      
      {/* Top Badges Skeleton */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end w-1/2">
        <Skeleton className="h-5 w-2/3 rounded-full" />
        <Skeleton className="h-5 w-1/2 rounded-full" />
      </div>

      {/* Info Overlay Skeleton */}
      <div className="relative z-10 w-full space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        </div>
        
        <div className="flex gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function StoriesSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative w-18 h-18 rounded-full p-[2px] bg-white/5 flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-full" />
          </div>
          <Skeleton className="h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
