// src/lib/image-optimizer.ts

interface OptimizeOptions {
  aspectRatio?: number; // Ej: 4/5 para galerias, 2/1 para 360
  maxWidth?: number;    // Ej: 1920 para web normal, 4096 para 360
  quality?: number;     // De 0.1 a 1.0
}

export async function optimizeAndCropImage(file: File, options: OptimizeOptions = {}): Promise<File> {
  const { aspectRatio, maxWidth = 1920, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    // 1. Leer el archivo original
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let srcWidth = img.width;
        let srcHeight = img.height;
        let srcX = 0;
        let srcY = 0;

        // 2. Recorte Inteligente (Center Crop) si se pide un aspect ratio
        if (aspectRatio) {
          const currentRatio = srcWidth / srcHeight;
          if (currentRatio > aspectRatio) {
            // La imagen es más ancha de lo necesario (recortar costados)
            const newWidth = srcHeight * aspectRatio;
            srcX = (srcWidth - newWidth) / 2;
            srcWidth = newWidth;
          } else {
            // La imagen es más alta de lo necesario (recortar arriba y abajo)
            const newHeight = srcWidth / aspectRatio;
            srcY = (srcHeight - newHeight) / 2;
            srcHeight = newHeight;
          }
        }

        // 3. Redimensionar si es gigante
        let destWidth = srcWidth;
        let destHeight = srcHeight;
        if (destWidth > maxWidth) {
          const scale = maxWidth / destWidth;
          destWidth = maxWidth;
          destHeight = srcHeight * scale;
        }

        // 4. Dibujar en el Canvas
        canvas.width = destWidth;
        canvas.height = destHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Error al procesar la imagen');

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, destWidth, destHeight);

        // 5. Convertir a WebP ultra comprimido
        canvas.toBlob((blob) => {
          if (blob) {
            // Cambiamos la extension a .webp pase lo que pase
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const newFile = new File([blob], newName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject('Error al convertir a WebP');
          }
        }, 'image/webp', quality);
      };
    };
    reader.onerror = (error) => reject(error);
  });
}