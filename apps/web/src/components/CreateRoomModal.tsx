'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (maxPlayers: 2 | 3 | 4, withBots: boolean) => Promise<void>;
  isLoading: boolean;
}

export default function CreateRoomModal({
  onClose,
  onCreate,
  isLoading,
}: CreateRoomModalProps) {
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [withBots, setWithBots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    try {
      await onCreate(maxPlayers, withBots);
    } catch (e: any) {
      setError(e.message || 'Co loi xay ra');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Tao Phong Moi</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Max players */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            So nguoi choi
          </label>
          <div className="flex gap-2">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className={clsx(
                  'flex-1 py-3 rounded-xl font-bold text-lg transition-all',
                  maxPlayers === n
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* With bots */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={clsx(
                'w-12 h-6 rounded-full transition-colors relative',
                withBots ? 'bg-purple-500' : 'bg-slate-700'
              )}
              onClick={() => setWithBots(!withBots)}
            >
              <div
                className={clsx(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  withBots ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </div>
            <div>
              <span className="text-white font-medium">Them bot tu dong</span>
              <p className="text-xs text-slate-500">
                Bot se tu dong tham gia neu chua du nguoi
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Room info preview */}
        <div className="mb-5 p-3 bg-slate-800 rounded-xl text-sm text-slate-400">
          <div className="flex justify-between">
            <span>So nguoi toi da:</span>
            <span className="text-white font-medium">{maxPlayers} nguoi</span>
          </div>
          {withBots && (
            <div className="flex justify-between mt-1">
              <span>Bot:</span>
              <span className="text-purple-400 font-medium">Co</span>
            </div>
          )}
        </div>

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
            onClick={handleCreate}
            disabled={isLoading}
            className={clsx(
              'flex-1 py-3 rounded-xl font-bold transition-all active:scale-95',
              isLoading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:shadow-lg hover:shadow-orange-500/25'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Dang tao...
              </span>
            ) : (
              'Tao Phong'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
