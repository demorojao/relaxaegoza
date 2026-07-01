'use client';

import React, { useEffect } from 'react';

interface WatermarkProps {
  text?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Watermark({ text = 'Relaxa & Goza', className = '', children }: WatermarkProps) {
  useEffect(() => {
    // Bloqueia clique direito e drag de imagens
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('.no-right-click')) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('.no-right-click')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden group select-none ${className}`}>
      {children}
      {/* Overlay da marca d'água com padrão diagonal */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 select-none">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 rotate-[-30deg] opacity-[0.07] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase whitespace-nowrap select-none scale-125">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="select-none">{text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
