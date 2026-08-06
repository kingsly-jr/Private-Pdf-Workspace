import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useUpload(maxSizeMb = 100, maxFiles = 10) {
  const [files, setFiles] = useState([]);

  const addFiles = useCallback((incomingFiles) => {
    const validFiles = [];
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    for (const file of incomingFiles) {
      if (file.size > maxSizeBytes) {
        toast.error(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeMb}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > maxFiles) {
        toast.error(`Maximum allowed files (${maxFiles}) reached.`);
        return combined.slice(0, maxFiles);
      }
      return combined;
    });
  }, [maxSizeMb, maxFiles]);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return { files, setFiles, addFiles, removeFile, clearFiles, hasFiles: files.length > 0 };
}

export default useUpload;
