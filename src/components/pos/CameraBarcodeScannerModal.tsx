import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../types/pharmacy';
import { formatCurrency } from '../../utils/formatters';
import { 
  Camera, 
  X, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Zap, 
  Sparkles,
  Layers,
  Volume2
} from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onBarcodeScanned: (code: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onBarcodeScanned,
}) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<{ code: string; name: string; time: string }[]>([]);
  const [isContinuous, setIsContinuous] = useState(true);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const lastCodeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start Barcode Detection Loop if supported
      initBarcodeDetector(videoRef.current);
    } catch (err: any) {
      console.warn('Camera access error in Barcode Scanner:', err);
      setCameraError('No se pudo acceder a la cámara. Puedes ingresar el código manualmente o seleccionar uno de los ejemplos.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const initBarcodeDetector = (videoEl: HTMLVideoElement | null) => {
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        });

        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                const now = Date.now();
                // Debounce duplicate scans within 1.5 seconds
                if (rawValue && (rawValue !== lastScannedCode || now - lastCodeTimeRef.current > 1500)) {
                  lastCodeTimeRef.current = now;
                  handleCodeDetected(rawValue);
                }
              }
            } catch (e) {
              // frame detection pass error (benign)
            }
          }
        }, 200);
      } catch (e) {
        console.warn('BarcodeDetector init error:', e);
      }
    }
  };

  const handleCodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);
    const matched = products.find(
      p => p.barcode === cleanCode || p.code.toLowerCase() === cleanCode.toLowerCase()
    );

    const scanRecord = {
      code: cleanCode,
      name: matched ? matched.name : 'Código no catalogado',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setRecentScans(prev => [scanRecord, ...prev.slice(0, 4)]);

    // Call parent handler to add to cart
    onBarcodeScanned(cleanCode);

    if (!isContinuous) {
      onClose();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Lector de Código de Barras</h3>
              <p className="text-[11px] text-slate-400">Escanea medicamentos y productos para sumarlos al carrito</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[340px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs mx-auto">{cameraError}</p>
              <button
                onClick={startCamera}
                className="btn btn-teal btn-sm bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs py-1.5 px-3"
              >
                Reintentar Cámara
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Target Box */}
                <div className="relative w-64 h-36 border-2 border-teal-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                  
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-teal-300 rounded-tl-sm"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-teal-300 rounded-tr-sm"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-teal-300 rounded-bl-sm"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-teal-300 rounded-br-sm"></div>

                  {/* Red/Green Laser Line Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse"></div>

                  <div className="absolute bottom-2 text-[10px] text-white/90 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                    Apunta al código de barras
                  </div>
                </div>
              </div>

              {/* Switch Camera Button */}
              <button
                onClick={toggleCameraFacing}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/20 text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                title="Cambiar cámara"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Options & Manual Code Fallback */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3">
          
          {/* Quick manual barcode tester */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Escribe o pega código de barras..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Agregar
            </button>
          </form>

          {/* Quick test barcodes from existing catalog */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Pruebas Rápidas de Códigos de Barras:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 5).map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleCodeDetected(prod.barcode || prod.code)}
                  className="px-2 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-lg text-[10px] font-medium text-slate-700 hover:text-teal-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <Barcode className="w-3 h-3 text-teal-600" />
                  <span className="truncate max-w-[120px] font-bold">{prod.name}</span>
                  <span className="font-mono text-slate-400">({prod.barcode || prod.code})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Scanned Log */}
          {recentScans.length > 0 && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                Últimos Artículos Leídos:
              </div>
              <div className="space-y-1">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-slate-800 truncate max-w-[240px]">{scan.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{scan.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isContinuous}
              onChange={e => setIsContinuous(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Modo continuo (seguir escaneando)</span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Listo / Terminar
          </button>
        </div>

      </div>
    </div>
  );
};
