import { useState, useCallback, useEffect } from 'react';

const MAX_SIZE_MB = 20; // antes de comprimir
const MAX_DIMENSION = 1920; // px — dimensão máxima (largura ou altura)
const JPEG_QUALITY = 0.82; // 0-1

/**
 * Comprime e converte qualquer imagem para JPEG via Canvas API.
 * Redimensiona para MAX_DIMENSION mantendo proporção.
 * Retorna um novo File pronto para upload.
 */
async function compressToJpeg(file: File, maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Redimensionar se necessário
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas não suportado')); return; }

      // Fundo branco (evita transparência virando preto no JPEG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Falha ao comprimir imagem')); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '') + '.jpg',
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Erro ao carregar imagem'));
    };

    img.src = objectUrl;
  });
}

interface UseImageUploadReturn {
  file: File | null;
  previewUrl: string;
  error: string;
  compressing: boolean;
  setFile: (file: File | undefined | null) => void;
  clear: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [compressing, setCompressing] = useState(false);

  const setFile = useCallback((newFile: File | undefined | null) => {
    // Revogar URL anterior
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setError('');

    if (!newFile) { setFileState(null); return; }

    if (newFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.`);
      setFileState(null);
      return;
    }

    setCompressing(true);

    compressToJpeg(newFile)
      .then(compressed => {
        const url = URL.createObjectURL(compressed);
        setFileState(compressed);
        setPreviewUrl(url);

        const originalKB = Math.round(newFile.size / 1024);
        const compressedKB = Math.round(compressed.size / 1024);
        console.log(`[Compressão] ${newFile.name}: ${originalKB}KB → ${compressedKB}KB (${Math.round((1 - compressed.size / newFile.size) * 100)}% menor)`);
      })
      .catch(err => {
        console.error('[Compressão] Erro:', err);
        // Fallback: usar arquivo original sem comprimir
        const url = URL.createObjectURL(newFile);
        setFileState(newFile);
        setPreviewUrl(url);
      })
      .finally(() => setCompressing(false));
  }, []);

  const clear = useCallback(() => {
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setFileState(null);
    setError('');
    setCompressing(false);
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return prev; });
    };
  }, []);

  return { file, previewUrl, error, compressing, setFile, clear };
}
