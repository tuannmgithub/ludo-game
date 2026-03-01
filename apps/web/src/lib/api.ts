import type { RoomInfo } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GuestAuthResponse {
  guestToken: string;
  playerId: string;
  username: string;
}

export interface CreateRoomRequest {
  maxPlayers: 2 | 3 | 4;
  withBots: boolean;
  guestToken: string;
}

export interface CreateRoomResponse {
  roomCode: string;
  room: RoomInfo;
}

export interface JoinRoomResponse {
  roomCode: string;
  room: RoomInfo;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  /**
   * Create or retrieve a guest auth token
   */
  async guestAuth(username: string): Promise<GuestAuthResponse> {
    return fetchJson<GuestAuthResponse>('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  /**
   * Get list of public rooms
   */
  async getRooms(): Promise<RoomInfo[]> {
    const data = await fetchJson<{ rooms: RoomInfo[] } | RoomInfo[]>('/api/rooms');
    // Backend returns { rooms: [...] }, handle both shapes for safety
    if (Array.isArray(data)) return data;
    return (data as { rooms: RoomInfo[] }).rooms ?? [];
  },

  /**
   * Create a new room
   */
  async createRoom(
    data: CreateRoomRequest
  ): Promise<CreateRoomResponse> {
    return fetchJson<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Join an existing room by code
   */
  async joinRoom(
    roomCode: string,
    guestToken: string,
    username: string
  ): Promise<JoinRoomResponse> {
    return fetchJson<JoinRoomResponse>(`/api/rooms/${roomCode}/join`, {
      method: 'POST',
      body: JSON.stringify({ guestToken, username }),
    });
  },

  /**
   * Get room details
   */
  async getRoom(roomCode: string): Promise<RoomInfo> {
    return fetchJson<RoomInfo>(`/api/rooms/${roomCode}`);
  },
};

/**
 * Utility: generate a random Vietnamese-style username
 */
export function generateUsername(): string {
  const adjectives = [
    'Nhanh', 'Mạnh', 'Khéo', 'Thông', 'Giỏi',
    'Vui', 'Dũng', 'Tài', 'Lanh', 'Sáng',
  ];
  const nouns = [
    'Ngựa', 'Voi', 'Hổ', 'Long', 'Phượng',
    'Rồng', 'Mèo', 'Chó', 'Gấu', 'Cáo',
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
}

/**
 * Storage helpers
 */
export const storage = {
  setCredentials(token: string, playerId: string, username: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('guestToken', token);
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('username', username);
  },

  getCredentials(): { guestToken: string | null; playerId: string | null; username: string | null } {
    if (typeof window === 'undefined') {
      return { guestToken: null, playerId: null, username: null };
    }
    return {
      guestToken: localStorage.getItem('guestToken'),
      playerId: localStorage.getItem('playerId'),
      username: localStorage.getItem('username'),
    };
  },

  setUsername(username: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('username', username);
  },

  getUsername(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('username');
  },

  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('guestToken');
    localStorage.removeItem('playerId');
    localStorage.removeItem('username');
  },
};
