import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  showHeader = true,
  showDefaultFooter = false,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  onSave,
  saveButtonId,
  hideCloseButton = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${maxWidth} bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden`}
      >
        {/* Header */}
        {showHeader && (
          <div className="bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-slate-700/50 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer || (showDefaultFooter && (
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
            >
              {cancelLabel}
            </button>
            {onSave && (
              <button
                onClick={onSave}
                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-primary-600/20 active:scale-95 transition-all"
                id={saveButtonId}
              >
                {saveLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
