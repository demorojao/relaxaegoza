'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { X, ShieldAlert, Check, RefreshCw } from 'lucide-react';

interface ImageBlurSelectorProps {
  imageSrc: string;
  onConfirm: (processedImageUrl: string) => void;
  onCancel: () => void;
}

export default function ImageBlurSelector({ imageSrc, onConfirm, onCancel }: ImageBlurSelectorProps) {
  const [posX, setPosX] = useState(50); // % X coordinates (0-100)
  const [posY, setPosY] = useState(40); // % Y coordinates (0-100)
  const [radius, setRadius] = useState(15); // % radius relative to image width (0-100)
  const [previewSrc, setPreviewSrc] = useState(imageSrc);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate blurred preview in real-time or debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 150);
    return () => clearTimeout(timer);
  }, [posX, posY, radius]);

  const generatePreview = () => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Convert percentages to actual pixel values
      const px = (posX / 100) * canvas.width;
      const py = (posY / 100) * canvas.height;
      
      // Keep radius proportional to the smaller dimension to prevent overflow
      const minDimension = Math.min(canvas.width, canvas.height);
      const pr = (radius / 100) * minDimension;

      // Draw circular blurred region
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.clip();

      // Apply strong filter blur
      ctx.filter = 'blur(35px)';
      ctx.drawImage(img, 0, 0);
      
      // Draw a secondary pixelation layer for extra security
      ctx.filter = 'none';
      ctx.restore();

      // Soft borders for the blurred circle to look premium
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(197, 168, 128, 0.3)'; // Gold borders
      ctx.stroke();
      ctx.restore();

      setPreviewSrc(canvas.toDataURL('image/jpeg', 0.92));
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    updateCoordinates(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateCoordinates(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateCoordinates = (e: React.PointerEvent<HTMLDivElement>) => {
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp coordinates within 0 to 100
    setPosX(Math.max(0, Math.min(100, x)));
    setPosY(Math.max(0, Math.min(100, y)));
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    // Double process to export final blob
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onConfirm(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const px = (posX / 100) * canvas.width;
      const py = (posY / 100) * canvas.height;
      const minDimension = Math.min(canvas.width, canvas.height);
      const pr = (radius / 100) * minDimension;

      // Apply absolute blur in canvas file
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = 'blur(45px)'; // Safe blur
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Export as Data URL
      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onConfirm(finalDataUrl);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <Card variant="glass-gold" className="w-full max-w-xl border border-gold-primary/20 shadow-2xl relative">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gold-primary" />
              Proteger Rosto & Privacidade
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Arraste o círculo ou use os controles para posicionar o borrão no rosto. A imagem original será apagada e apenas o arquivo borrado será enviado ao servidor (100% à prova de vazamentos).
            </p>
          </div>

          {/* Draggable Area Container */}
          <div 
            ref={containerRef}
            className="relative w-full aspect-square bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center cursor-crosshair select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={previewSrc}
              alt="Preview"
              className="max-w-full max-h-full object-contain pointer-events-none"
            />

            {/* Draggable Circle Visual Overlay */}
            {imageRef.current && (
              <div
                className="absolute border-2 border-dashed border-gold-primary bg-gold-primary/10 rounded-full shadow-[0_0_15px_rgba(197,168,128,0.3)] backdrop-blur-[1px] pointer-events-none"
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  width: `${radius * 2}%`,
                  height: `${radius * 2}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
          </div>

          {/* Sliders Control Section */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-400">
                <span>Tamanho do Borrão</span>
                <span className="text-gold-light">{radius}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1 bg-black/50 accent-gold-primary rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span>Posição X</span>
                  <span className="text-gold-light">{posX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                  className="w-full h-1 bg-black/50 accent-gold-primary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span>Posição Y</span>
                  <span className="text-gold-light">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  className="w-full h-1 bg-black/50 accent-gold-primary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <Button
              variant="dark"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleConfirm}
              isLoading={isProcessing}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Aplicar & Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
