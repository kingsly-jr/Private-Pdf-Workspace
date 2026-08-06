import { useCallback } from 'react';
import toast from 'react-hot-toast';

export function useDownload() {
  const downloadBlob = useCallback((response, defaultFilename = 'processed_document.pdf') => {
    try {
      let filename = defaultFilename;
      const disposition = response.headers ? response.headers['content-disposition'] : null;

      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const data = response.data || response;
      const contentType = (response.headers && response.headers['content-type']) || 'application/pdf';

      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded: ${filename}`);
    } catch (err) {
      console.error('Failed to trigger file download:', err);
      toast.error('Failed to trigger browser download.');
    }
  }, []);

  const viewBlob = useCallback((response, defaultFilename = 'processed_document.pdf') => {
    try {
      const data = response.data || response;
      const contentType = (response.headers && response.headers['content-type']) || 'application/pdf';

      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      // Open in a new tab for previewing
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback if popup blocked
        toast.error('Pop-up blocked. Triggering direct view...');
        window.location.href = url;
      } else {
        toast.success('Opening file preview in new tab...');
      }
    } catch (err) {
      console.error('Failed to preview file:', err);
      toast.error('Failed to open file preview.');
    }
  }, []);

  return { downloadBlob, viewBlob };
}

export default useDownload;
