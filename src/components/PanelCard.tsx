'use client';

import { useState, useEffect, useCallback } from 'react';

export function InfoRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-700 last:border-0">
      <code className="text-blue-300 text-xs font-mono shrink-0 pt-px">{name}</code>
      <span className="text-gray-400 text-xs">{desc}</span>
    </div>
  );
}

interface Props {
  title: string;
  info: React.ReactNode;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function PanelCard({ title, info, children, headerRight }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-1.5 text-sm font-semibold text-gray-300 uppercase tracking-wider hover:text-blue-400 transition-colors text-left"
        >
          {title}
          <svg
            className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {headerRight}
      </div>

      {children}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <h3 className="text-base font-semibold text-white uppercase tracking-wider">{title}</h3>
              <button
                onClick={close}
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none mt-px shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed">{info}</div>
          </div>
        </div>
      )}
    </div>
  );
}
