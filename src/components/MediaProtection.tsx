'use client';

import { useEffect } from 'react';

export default function MediaProtection() {
  useEffect(() => {
    // 1. Bloqueio de atalhos de teclado para salvar página ou ver código-fonte
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+S / Cmd+S (Salvar página)
      if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+P / Cmd+P (Imprimir)
      if (ctrlOrCmd && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+U (Ver código-fonte)
      if (ctrlOrCmd && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 2. Bloqueio de clique direito (menu contextual) em mídias
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isMedia = 
        target.tagName === 'IMG' || 
        target.tagName === 'VIDEO' || 
        target.tagName === 'CANVAS' ||
        target.closest('.protected-media') !== null;

      if (isMedia) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 3. Bloqueio de arraste de imagens (drag & drop para desktop)
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isMedia = 
        target.tagName === 'IMG' || 
        target.tagName === 'VIDEO' || 
        target.closest('.protected-media') !== null;

      if (isMedia) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  return null;
}
