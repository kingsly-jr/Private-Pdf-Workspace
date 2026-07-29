import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, RotateCw, Trash2, CheckCircle2, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CameraScanModal({ isOpen, onClose, onComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedPages, setCapturedPages] = useState([]); // [{ id, dataUrl, rotation }]
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedPages([]);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions in your browser.');
      toast.error('Camera permission denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedPages(prev => [
      ...prev,
      { id: Date.now() + Math.random(), dataUrl, rotation: 0 }
    ]);
    toast.success(`Page ${capturedPages.length + 1} captured!`);
  };

  const rotatePage = (id) => {
    setCapturedPages(prev =>
      prev.map(p => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const removePage = (id) => {
    setCapturedPages(prev => prev.filter(p => p.id !== id));
  };

  const handleFinish = async () => {
    if (capturedPages.length === 0) {
      toast.error('Please capture at least one page before completing.');
      return;
    }

    try {
      // Convert dataUrls to Blob File objects
      const filePromises = capturedPages.map(async (page, index) => {
        const res = await fetch(page.dataUrl);
        const blob = await res.blob();
        return new File([blob], `scanned_page_${index + 1}.jpg`, { type: 'image/jpeg' });
      });

      const files = await Promise.all(filePromises);
      stopCamera();
      onComplete(files);
      onClose();
    } catch (err) {
      console.error('Error generating scan files:', err);
      toast.error('Failed to process captured pages.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Camera Document Scanner</h2>
              <p className="text-xs text-slate-400">Capture photos of your document pages using your webcam or phone camera</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid: Camera Viewfinder Left + Captured Pages Thumbnails Right */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Viewfinder */}
          <div className="space-y-4 flex flex-col items-center justify-center bg-slate-950 rounded-2xl p-4 border border-slate-800 relative">
            {cameraError ? (
              <div className="text-center p-6 space-y-3">
                <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 sm:h-80 object-cover rounded-xl border border-slate-800 shadow-inner"
                />
                <button
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Page {capturedPages.length + 1}</span>
                </button>
              </>
            )}
          </div>

          {/* Captured Pages Gallery */}
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Captured Pages ({capturedPages.length})
              </h3>
              {capturedPages.length > 0 && (
                <button
                  onClick={() => setCapturedPages([])}
                  className="text-xs text-slate-400 hover:text-rose-400"
                >
                  Clear Pages
                </button>
              )}
            </div>

            {capturedPages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-2">
                <Camera className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium">No pages captured yet</p>
                <p className="text-[11px] opacity-60">Click "Capture Page" on the left to snap document pages</p>
              </div>
            ) : (
              <div className="flex-1 max-h-80 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {capturedPages.map((page, index) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={page.dataUrl}
                        alt={`Page ${index + 1}`}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                        className="w-12 h-14 object-cover rounded-lg border border-slate-800 transition-transform"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Page {index + 1}</span>
                        <span className="text-[10px] text-slate-400">{page.rotation}° rotation</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => rotatePage(page.id)}
                        className="p-2 text-slate-400 hover:text-brand-400 rounded-lg hover:bg-slate-900"
                        title="Rotate page"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePage(page.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900"
                        title="Delete page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleFinish}
              disabled={capturedPages.length === 0}
              className="w-full mt-auto py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish & Create PDF ({capturedPages.length} {capturedPages.length === 1 ? 'Page' : 'Pages'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
