'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface JoinRoomModalProps {
  onClose: () => void;
  onJoin: (roomCode: string) => Promise<void>;
  isLoading: boolean;
  initialCode?: string;
}

export default function JoinRoomModal({
  onClose,
  onJoin,
  isLoading,
  initialCode = '',
}: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState(initialCode.toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Vui long nhap ma phong');
      return;
    }
    if (roomCode.length !== 6) {
      setError('Ma phong phai co 6 ky tu');
      return;
    }
    setError(null);
    try {
      await onJoin(roomCode.trim().toUpperCase());
    } catch (e: any) {
      setError(e.message || 'Khong the vao phong');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Vao Phong</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Room code input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Ma Phong (6 ky tu)
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase().slice(0, 6));
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="VI DU: ABC123"
            className={clsx(
              'w-full px-4 py-3 bg-slate-800 border rounded-xl',
              'text-white text-center text-2xl font-mono font-bold tracking-widest',
              'focus:outline-none focus:ring-2 focus:ring-yellow-500',
              'placeholder:text-slate-600 placeholder:text-base placeholder:font-normal placeholder:tracking-normal',
              'transition-colors',
              error ? 'border-red-500' : 'border-slate-600 hover:border-slate-500'
            )}
            autoFocus
            maxLength={6}
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center mb-5">
          Nhan ma phong tu chu phong va nhap vao day de tham gia tran dau
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
          >
            Huy
          </button>
          <button
            onClick={handleJoin}
            disabled={isLoading || roomCode.length !== 6}
            className={clsx(
              'flex-1 py-3 rounded-xl font-bold transition-all active:scale-95',
              isLoading || roomCode.length !== 6
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Dang vao...
              </span>
            ) : (
              'Vao Phong'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
