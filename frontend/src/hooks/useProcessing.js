import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    setProgress(10);
    setError(null);
  }, []);

  const updateProgress = useCallback((val) => {
    setProgress(val);
  }, []);

  const finishProcessing = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsProcessing(false);
      setProgress(0);
    }, 500);
  }, []);

  const handleError = useCallback((err, toolName = 'tool') => {
    setIsProcessing(false);
    setProgress(0);
    let message = 'An unexpected error occurred during processing.';

    if (err.response && err.response.data) {
      // Check if error response is JSON arraybuffer
      if (err.response.data instanceof ArrayBuffer) {
        try {
          const decoded = JSON.parse(new TextDecoder().decode(err.response.data));
          message = decoded.message || message;
        } catch {
          // ignore fallback
        }
      } else if (err.response.data.message) {
        message = err.response.data.message;
      }
    } else if (err.message) {
      message = err.message;
    }

    setError(message);
    toast.error(`[${toolName.toUpperCase()}] ${message}`);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    startProcessing,
    updateProgress,
    finishProcessing,
    handleError
  };
}

export default useProcessing;
