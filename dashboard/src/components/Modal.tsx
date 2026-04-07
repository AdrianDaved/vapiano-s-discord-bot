import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard handler — re-runs only when open/onClose change
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Initial focus — only when the modal opens (NOT on every re-render of the parent)
  useEffect(() => {
    if (!open) return;
    const closeBtn = dialogRef.current?.querySelector<HTMLElement>('button');
    closeBtn?.focus();
  }, [open]); // ← intentionally excludes onClose to prevent focus theft on every keystroke

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative bg-discord-light rounded-xl shadow-2xl ${maxWidth} w-full mx-4 max-h-[85vh] flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-discord-lighter">
          <h2 id="modal-title" className="text-lg font-semibold text-discord-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-discord-lighter text-discord-muted hover:text-discord-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-discord-blurple"
            aria-label="Cerrar dialogo"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
