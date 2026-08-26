import React from 'react';
import { CustomerDocument } from '../../types/pharmacy';
import { X, Download, FileText, ExternalLink, Calendar, Tag } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface DocumentViewerModalProps {
  document: CustomerDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  const isPdf = document.type === 'pdf' || document.fileData?.startsWith('data:application/pdf');

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.fileData;
    link.download = document.name || `documento-${document.id}.${isPdf ? 'pdf' : 'jpg'}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                {document.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5 font-medium">
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {document.category}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(document.uploadDate)}
                </span>
                {document.fileSize && (
                  <>
                    <span>•</span>
                    <span>{document.fileSize}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-900 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes banner if present */}
        {document.notes && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
            <span className="font-semibold">Nota: </span>
            {document.notes}
          </div>
        )}

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center">
              <iframe
                src={document.fileData}
                className="w-full h-[65vh] rounded-lg border border-slate-300 bg-white"
                title={document.name}
              />
              <p className="text-xs text-slate-600 mt-2 text-center font-medium">
                ¿No visualiza el PDF? Use el botón "Descargar" o{' '}
                <a
                  href={document.fileData}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline font-semibold inline-flex items-center gap-0.5"
                >
                  abrir en pestaña nueva <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center p-2">
              <img
                src={document.fileData}
                alt={document.name}
                className="max-w-full max-h-[68vh] object-contain rounded-lg shadow-md border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};
