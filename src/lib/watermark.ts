/**
 * Helper client-side para aplicar marca d'água em imagens antes do upload.
 */
export async function applyWatermark(file: File, text: string = 'Relaxa & Goza'): Promise<File> {
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

        // Define o tamanho da fonte proporcional à largura da imagem
        // (ex: 2.8% da largura da imagem, mínimo de 14px)
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

        // Opcional: Adicionar uma segunda marca d'água no centro ou canto superior esquerdo com menor opacidade
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `italic ${Math.max(12, fontSize * 0.75)}px sans-serif`;
        ctx.fillText('relaxaegoza.com', marginX, marginY);

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
          0.85 // compressão de 85% para manter boa qualidade e reduzir tamanho de arquivo
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
