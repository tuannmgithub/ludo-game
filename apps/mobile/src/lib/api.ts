const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export async function guestAuth(): Promise<{
  guestToken: string;
  playerId: string;
  username: string;
}> {
  const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`guestAuth failed: ${res.status}`);
  }
  return res.json();
}

export async function createRoom(params: {
  username: string;
  maxPlayers: 2 | 3 | 4;
  withBots: boolean;
  guestToken: string;
}): Promise<{ roomCode: string; [key: string]: any }> {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`createRoom failed: ${res.status}`);
  }
  return res.json();
}

export async function joinRoom(
  roomCode: string,
  params: { username: string; guestToken: string }
): Promise<{ [key: string]: any }> {
  const res = await fetch(`${API_URL}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`joinRoom failed: ${res.status}`);
  }
  return res.json();
}

export async function getRooms(): Promise<{ rooms: any[] }> {
  const res = await fetch(`${API_URL}/api/rooms`);
  if (!res.ok) {
    throw new Error(`getRooms failed: ${res.status}`);
  }
  return res.json();
}

export async function quickMatch(params: {
  username: string;
  guestToken: string;
}): Promise<{ roomCode: string; [key: string]: any }> {
  const res = await fetch(`${API_URL}/api/rooms/quick-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`quickMatch failed: ${res.status}`);
  }
  return res.json();
}
