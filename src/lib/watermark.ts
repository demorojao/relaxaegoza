export interface TextOverlayConfig {
  content: string;
  x: number; // 0-100
  y: number; // 0-100
  color: 'white' | 'gold' | 'wine';
  bg: 'black-blur' | 'wine-solid' | 'none';
}

/**
 * Helper client-side para aplicar marca d'água em imagens antes do upload.
 * Também aceita uma configuração opcional de sobreposição de texto (estilo Instagram).
 */
export async function applyWatermark(
  file: File, 
  text: string = 'Relaxa & Goza',
  textOverlay?: TextOverlayConfig
): Promise<File> {
  // Apenas processa arquivos de imagem
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(file);
          return;
        }

        // Desenha a imagem original no canvas
        ctx.drawImage(img, 0, 0);

        // --- MARCA D'ÁGUA ---
        // Define o tamanho da fonte proporcional à largura da imagem
        const fontSize = Math.max(14, Math.floor(img.width * 0.028));
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Estilos para a marca d'água (semi-transparente)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // Branco transparente
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Borda fina escura para legibilidade em fundos brancos
        ctx.lineWidth = Math.max(1, fontSize / 8);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // Posição: Canto inferior direito com uma pequena margem (2% do tamanho)
        const marginX = img.width * 0.02;
        const marginY = img.height * 0.02;
        const posX = img.width - marginX;
        const posY = img.height - marginY;

        // Desenha a sombra da borda e depois o texto
        ctx.strokeText(text, posX, posY);
        ctx.fillText(text, posX, posY);

        // Segunda marca d'água no canto superior esquerdo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `italic ${Math.max(12, fontSize * 0.75)}px sans-serif`;
        ctx.fillText('relaxaegoza.com', marginX, marginY);

        // --- TEXT OVERLAY (Instagram style) ---
        if (textOverlay && textOverlay.content.trim()) {
          const textFontSize = Math.max(22, Math.floor(img.width * 0.045)); // Fonte legível para o story
          ctx.font = `bold ${textFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const overlayX = (textOverlay.x / 100) * img.width;
          const overlayY = (textOverlay.y / 100) * img.height;

          // Medição para desenhar fundo
          const textWidth = ctx.measureText(textOverlay.content).width;
          const paddingX = textFontSize * 0.6;
          const paddingY = textFontSize * 0.35;
          const bgWidth = textWidth + paddingX * 2;
          const bgHeight = textFontSize + paddingY * 2;

          // Se tiver estilo de fundo, desenha um retângulo arredondado
          if (textOverlay.bg !== 'none') {
            ctx.fillStyle = textOverlay.bg === 'wine-solid' ? 'rgba(114, 47, 55, 0.95)' : 'rgba(0, 0, 0, 0.65)';
            
            const rx = overlayX - bgWidth / 2;
            const ry = overlayY - bgHeight / 2;
            const radius = Math.max(6, textFontSize * 0.3); // raio proporcional
            
            ctx.beginPath();
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + bgWidth - radius, ry);
            ctx.quadraticCurveTo(rx + bgWidth, ry, rx + bgWidth, ry + radius);
            ctx.lineTo(rx + bgWidth, ry + bgHeight - radius);
            ctx.quadraticCurveTo(rx + bgWidth, ry + bgHeight, rx + bgWidth - radius, ry + bgHeight);
            ctx.lineTo(rx + radius, ry + bgHeight);
            ctx.quadraticCurveTo(rx, ry + bgHeight, rx, ry + bgHeight - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
            ctx.fill();
          }

          // Define cor do texto e desenha
          ctx.fillStyle = textOverlay.color === 'gold' ? '#F59E0B' : textOverlay.color === 'wine' ? '#EF4444' : '#FFFFFF';
          ctx.fillText(textOverlay.content, overlayX, overlayY);
        }

        // Converte o canvas de volta para Blob/File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const watermarkedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(watermarkedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.85
        );
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
