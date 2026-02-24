import { useState, useCallback, useEffect } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE_MB = 10;

interface UseImageUploadReturn {
  file: File | null;
  previewUrl: string;
  error: string;
  setFile: (file: File | undefined | null) => void;
  clear: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const setFile = useCallback((newFile: File | undefined | null) => {
    // Revogar URL anterior para liberar memória
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setError('');

    if (!newFile) {
      setFileState(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(newFile.type)) {
      setError('Formato inválido. Use JPG, PNG ou WEBP.');
      setFileState(null);
      return;
    }

    if (newFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.`);
      setFileState(null);
      return;
    }

    const url = URL.createObjectURL(newFile);
    setFileState(newFile);
    setPreviewUrl(url);
  }, []);

  const clear = useCallback(() => {
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setFileState(null);
    setError('');
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return prev; });
    };
  }, []);

  return { file, previewUrl, error, setFile, clear };
}
