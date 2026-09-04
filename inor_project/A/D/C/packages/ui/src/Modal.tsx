'use client';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@yt/shared';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Modal({ open, onClose, title, children, className, showClose = true }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          'bg-[#0f0f0f] border border-[#272727] rounded-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200',
          className,
        )}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#272727]">
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {showClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#272727] transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
