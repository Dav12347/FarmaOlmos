import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  Volume2,
  VolumeX,
  Plus
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
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<{ code: string; name: string; price: number; time: string }[]>([]);
  const [isContinuous, setIsContinuous] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastScanValueRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM element #camera-barcode-reader to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, cameraFacing]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5QrCode:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScannerRunning(false);
  };

  const startScanner = async () => {
    setCameraError(null);
    await stopScanner();

    const elementId = 'camera-barcode-reader';
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const qrCode = new Html5Qrcode(elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333333,
      };

      await qrCode.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Frame decode pass (silent)
        }
      );

      setIsScannerRunning(true);
    } catch (err: any) {
      console.warn('Camera scanner start error:', err);
      setCameraError('No se pudo inicializar la cámara. Verifica los permisos de tu navegador o ingresa el código manualmente.');
      setIsScannerRunning(false);
    }
  };

  const handleCodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Prevent duplicated rapid trigger of the same code within 1.4 seconds
    if (cleanCode === lastScanValueRef.current && now - lastScanTimestampRef.current < 1400) {
      return;
    }

    lastScanTimestampRef.current = now;
    lastScanValueRef.current = cleanCode;
    setLastScannedCode(cleanCode);

    // Trigger green flash animation
    setScanSuccessFlash(true);
    setTimeout(() => setScanSuccessFlash(false), 500);

    const matched = products.find(
      p => (p.barcode && p.barcode.trim().toLowerCase() === cleanCode.toLowerCase()) || 
           (p.code && p.code.trim().toLowerCase() === cleanCode.toLowerCase())
    );

    const scanRecord = {
      code: cleanCode,
      name: matched ? matched.name : 'Código no catalogado',
      price: matched ? matched.sellingPrice : 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setRecentScans(prev => [scanRecord, ...prev.slice(0, 4)]);

    // Call parent handler to automatically add to sales cart!
    onBarcodeScanned(cleanCode);

    if (!isContinuous) {
      onClose();
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl ring-1 ring-teal-500/40">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Escáner Automático de Medicamentos</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Al Carrito
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Cada código escaneado se agrega automáticamente a la venta</p>
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
        <div className={`relative bg-black flex-1 min-h-[270px] max-h-[350px] flex items-center justify-center overflow-hidden transition-all duration-300 ${
          scanSuccessFlash ? 'ring-4 ring-emerald-500 ring-inset' : ''
        }`}>
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs mx-auto">{cameraError}</p>
              <button
                onClick={startScanner}
                className="btn btn-teal btn-sm bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs py-1.5 px-3 font-bold"
              >
                Reintentar Cámara
              </button>
            </div>
          ) : (
            <>
              {/* HTML5 QR/Barcode Video Container */}
              <div id="camera-barcode-reader" className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

              {/* Scanning Laser Line Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-teal-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                  
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-teal-300 rounded-tl-sm"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-teal-300 rounded-tr-sm"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-teal-300 rounded-bl-sm"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-teal-300 rounded-br-sm"></div>

                  {/* Red/Green Laser Line Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse"></div>

                  <div className="absolute bottom-2 text-[10px] text-white/95 font-bold bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Enfoca el código de barras
                  </div>
                </div>
              </div>

              {/* Success Flash Badge */}
              {scanSuccessFlash && (
                <div className="absolute top-4 inset-x-0 mx-auto w-max px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Código detectado y agregado al carrito!</span>
                </div>
              )}

              {/* Switch Camera Button */}
              <button
                onClick={toggleCameraFacing}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/20 text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md z-10"
                title="Cambiar cámara (Frontal/Trasera)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Options & Manual Code Fallback */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3">
          
          {/* Quick manual barcode input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="O escribe / pega el código de barras..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </form>

          {/* Recent Scanned Log */}
          {recentScans.length > 0 && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                Últimos Medicamentos Escaneados:
              </div>
              <div className="space-y-1">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-slate-800 truncate max-w-[220px]">{scan.name}</span>
                    <div className="flex items-center gap-2">
                      {scan.price > 0 && (
                        <span className="font-bold text-teal-700">{formatCurrency(scan.price)}</span>
                      )}
                      <span className="font-mono text-[10px] text-slate-400">{scan.code}</span>
                    </div>
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
            <span className="font-bold text-teal-900">Modo continuo (seguir escaneando varios)</span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Listo / Ver Carrito
          </button>
        </div>

      </div>
    </div>
  );
};
