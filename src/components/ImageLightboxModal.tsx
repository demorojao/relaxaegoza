'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { getCDNUrl } from '@/lib/mediaHelper';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { id?: string; url: string; media_type?: string }[];
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  profileName?: string;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onIndexChange,
  profileName
}: ImageLightboxModalProps) {
  const currentImage = images[currentIndex];

  const handleNext = useCallback(() => {
    if (images.length === 0) return;
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (images.length === 0) return;
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentImage) return null;

  const isVideo = currentImage.media_type === 'video' || currentImage.url.match(/\.(mp4|webm|mov)$/i);
  const mediaUrl = getCDNUrl(currentImage.url);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-2xl select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top Header */}
        <div className="z-10 px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gold-primary/10 border border-gold-primary/20 rounded-full text-gold-light text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-gold-primary animate-pulse" />
              <span>{profileName ? `Galeria de ${profileName}` : 'Visualizador HD'}</span>
            </div>
            {images.length > 1 && (
              <span className="text-xs text-gray-400 font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Media Container */}
        <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 sm:left-6 z-20 w-12 h-12 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90 cursor-pointer shadow-lg backdrop-blur-md"
                title="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90 cursor-pointer shadow-lg backdrop-blur-md"
                title="Próxima"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center"
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              />
            ) : (
              <div className="relative group">
                <img
                  src={mediaUrl}
                  alt={`Midia ${currentIndex + 1}`}
                  className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10 pointer-events-none select-none"
                  draggable={false}
                />
                
                {/* Anti-Save Transparent Overlay Shield */}
                <div 
                  className="absolute inset-0 z-10 pointer-events-auto"
                  onContextMenu={(e) => e.preventDefault()}
                />

                {/* Watermark Banner */}
                <div className="absolute bottom-4 right-4 z-20 bg-black/70 backdrop-blur-md border border-gold-primary/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 pointer-events-none">
                  <ShieldCheck className="w-4 h-4 text-gold-primary" />
                  <span className="text-[10px] font-bold tracking-widest text-gold-light uppercase">
                    Relaxe & Goze Exclusivo
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Thumbnail Strip */}
        <div className="z-10 px-4 py-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, idx) => {
            const thumbUrl = getCDNUrl(img.url);
            const isSelected = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => onIndexChange(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'border-gold-primary scale-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                    : 'border-white/20 opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumb ${idx}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
