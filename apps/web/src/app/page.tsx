'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api, generateUsername, storage } from '@/lib/api';
import { useGameStore } from '@/store/gameStore';
import CreateRoomModal from '@/components/CreateRoomModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import type { RoomInfo, PlayerColor } from '@/types/game';

const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
};

// Animated dice SVG
function AnimatedDice() {
  const [face, setFace] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setFace((prev) => (prev % 6) + 1);
    }, 900);
    return () => clearInterval(t);
  }, []);

  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };

  return (
    <svg width="80" height="80" viewBox="0 0 100 100" className="inline-block animate-bounce">
      <rect x="5" y="5" width="90" height="90" rx="15" fill="white" stroke="#e2e8f0" strokeWidth="3" />
      {(dotPositions[face] || []).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#1e293b" />
      ))}
    </svg>
  );
}

function RoomCard({ room, onJoin }: { room: RoomInfo; onJoin: (code: string) => void }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    waiting: { label: 'Dang cho', color: 'text-green-400' },
    playing: { label: 'Dang choi', color: 'text-yellow-400' },
    finished: { label: 'Ket thuc', color: 'text-slate-500' },
  };
  const s = statusMap[room.status] || statusMap.waiting;
  const canJoin = room.status === 'waiting' && room.playerCount < room.maxPlayers;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-600 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono font-bold text-white text-sm bg-slate-700 px-2 py-0.5 rounded">
            {room.roomCode}
          </span>
          <span className={clsx('text-xs font-medium', s.color)}>{s.label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{room.hostUsername}</span>
          <span className="text-slate-600">|</span>
          <span>{room.playerCount}/{room.maxPlayers} nguoi</span>
          {room.withBots && (
            <span className="text-xs text-purple-400">[+bot]</span>
          )}
        </div>
        {/* Player color indicators */}
        <div className="flex gap-1 mt-1.5">
          {room.players.map((p, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: COLOR_HEX[p.color] }}
              title={p.username}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => onJoin(room.roomCode)}
        disabled={!canJoin}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0',
          canJoin
            ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        )}
      >
        {canJoin ? 'Vao' : 'Day'}
      </button>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { setCredentials, username: storedUsername, setUsername } = useGameStore();

  const [username, setLocalUsername] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load username from storage
  useEffect(() => {
    const stored = storage.getUsername();
    if (stored) {
      setLocalUsername(stored);
      setUsername(stored);
    } else {
      const generated = generateUsername();
      setLocalUsername(generated);
      setUsername(generated);
    }
  }, []);

  // Load rooms
  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch {
      // Silently fail - server might not be up
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  const ensureAuth = async (name: string): Promise<{ token: string; pid: string }> => {
    const existing = storage.getCredentials();
    if (existing.guestToken && existing.playerId) {
      return { token: existing.guestToken, pid: existing.playerId };
    }
    const auth = await api.guestAuth(name);
    storage.setCredentials(auth.guestToken, auth.playerId, auth.username);
    setCredentials(auth.guestToken, auth.playerId, auth.username);
    return { token: auth.guestToken, pid: auth.playerId };
  };

  const handleUsernameChange = (val: string) => {
    setLocalUsername(val);
    setUsername(val);
    storage.setUsername(val);
  };

  const handleCreateRoom = async (maxPlayers: 2 | 3 | 4, withBots: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const name = username || generateUsername();
      const { token } = await ensureAuth(name);
      const result = await api.createRoom({ maxPlayers, withBots, guestToken: token });
      setShowCreate(false);
      router.push(`/game/${result.roomCode}`);
    } catch (e: any) {
      setError(e.message || 'Khong the tao phong');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const name = username || generateUsername();
      const { token } = await ensureAuth(name);
      await api.joinRoom(roomCode, token, name);
      setShowJoin(false);
      router.push(`/game/${roomCode}`);
    } catch (e: any) {
      setError(e.message || 'Khong the vao phong');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPlay = async () => {
    setError(null);
    // Only join human-only rooms with no bots — bot rooms require the host to manually
    // start, which would leave a joining player stuck waiting indefinitely.
    // Also require at least the host to still be present (playerCount > 0).
    const available = rooms.find(
      (r) =>
        r.status === 'waiting' &&
        r.playerCount < r.maxPlayers &&
        r.withBots === false &&
        r.playerCount > 0
    );
    if (available) {
      await handleJoinRoom(available.roomCode);
    } else {
      // No suitable room found — create a new room with bots.
      // This player will be the host and the game will auto-start.
      await handleCreateRoom(4, true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-start py-12 px-4">
      {/* Header / Hero */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AnimatedDice />
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Co Ca Ngua
            </h1>
            <p className="text-blue-400 font-semibold text-lg tracking-wide">
              ONLINE
            </p>
          </div>
          <AnimatedDice />
        </div>
        <p className="text-slate-400 text-lg">
          Tro choi co ca ngua truc tuyen • Choi cung ban be hoac bot
        </p>

        {/* Color preview */}
        <div className="flex justify-center gap-2 mt-4">
          {(['red', 'blue', 'yellow', 'green'] as PlayerColor[]).map((c) => (
            <div
              key={c}
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: COLOR_HEX[c], animationDelay: `${Math.random() * 0.5}s` }}
            />
          ))}
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md space-y-4 animate-slide-up">
        {/* Username input */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Ten cua ban
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value.slice(0, 20))}
              placeholder="Nhap ten nguoi dung..."
              className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              maxLength={20}
            />
            <button
              onClick={() => {
                const name = generateUsername();
                handleUsernameChange(name);
              }}
              className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors border border-slate-600"
              title="Tao ten ngau nhien"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid gap-3">
          {/* Quick Play */}
          <button
            onClick={handleQuickPlay}
            disabled={isLoading}
            className={clsx(
              'w-full py-4 rounded-2xl font-bold text-xl transition-all active:scale-95',
              'bg-gradient-to-r from-yellow-400 to-orange-500 text-black',
              'hover:from-yellow-300 hover:to-orange-400 hover:shadow-xl hover:shadow-orange-500/25',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
              'flex items-center justify-center gap-3'
            )}
          >
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            {isLoading ? 'Dang xu ly...' : 'Choi Nhanh'}
          </button>

          <div className="grid grid-cols-2 gap-3">
            {/* Create Room */}
            <button
              onClick={() => setShowCreate(true)}
              disabled={isLoading}
              className={clsx(
                'py-3 px-4 rounded-xl font-bold transition-all active:scale-95',
                'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600',
                'hover:border-slate-500 hover:shadow-lg',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Tao Phong
            </button>

            {/* Join Room */}
            <button
              onClick={() => setShowJoin(true)}
              disabled={isLoading}
              className={clsx(
                'py-3 px-4 rounded-xl font-bold transition-all active:scale-95',
                'bg-blue-600 hover:bg-blue-500 text-white',
                'hover:shadow-lg hover:shadow-blue-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Vao Phong
            </button>
          </div>
        </div>

        {/* Public rooms list */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Phong Dang Mo ({rooms.filter((r) => r.status === 'waiting').length})
            </h3>
            <button
              onClick={loadRooms}
              disabled={isLoadingRooms}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={clsx(isLoadingRooms && 'animate-spin')}
              >
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {isLoadingRooms && rooms.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Dang tai phong...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-slate-600 border border-dashed border-slate-700 rounded-xl">
              <p className="text-sm">Chua co phong nao</p>
              <p className="text-xs mt-1">Hay tao phong moi!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {rooms.map((room) => (
                <RoomCard
                  key={room.roomCode}
                  room={room}
                  onJoin={(code) => handleJoinRoom(code)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pt-4 pb-2">
          <p>Co Ca Ngua Online v1.0 • Backend: {process.env.NEXT_PUBLIC_API_URL}</p>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateRoom}
          isLoading={isLoading}
        />
      )}

      {showJoin && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          onJoin={handleJoinRoom}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
