import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BotDifficulty, GuestTokenPayload } from '../types';
import {
  createRoom,
  joinRoom,
  getRoom,
  listPublicRooms,
  roomToInfo,
  generateUsername,
} from '../room-manager';
import { JWT_SECRET } from './auth';

const router = Router();

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Verify or create a guest token. Returns { guestToken, playerId, username }. */
function resolveGuest(
  guestToken?: string
): { guestToken: string; playerId: string; username: string } {
  if (guestToken) {
    try {
      const decoded = jwt.verify(guestToken, JWT_SECRET) as GuestTokenPayload;
      return {
        guestToken,
        playerId: decoded.playerId,
        username: decoded.username,
      };
    } catch {
      // Token invalid — issue a new one
    }
  }

  const playerId = uuidv4();
  const username = generateUsername();
  const newToken = jwt.sign({ playerId, username } as GuestTokenPayload, JWT_SECRET, {
    expiresIn: '7d',
  });
  return { guestToken: newToken, playerId, username };
}

// -------------------------------------------------------------------------
// POST /api/rooms
// Create a new room
// -------------------------------------------------------------------------

router.post('/', (req: Request, res: Response) => {
  try {
    const {
      username: reqUsername,
      maxPlayers = 4,
      withBots = false,
      guestToken,
      botDifficulty,
    } = req.body as {
      username?: string;
      maxPlayers?: 2 | 3 | 4;
      withBots?: boolean;
      guestToken?: string;
      botDifficulty?: BotDifficulty;
    };

    const resolved = resolveGuest(guestToken);
    const username = reqUsername || resolved.username;

    // Validate maxPlayers
    if (![2, 3, 4].includes(maxPlayers)) {
      res.status(400).json({ error: 'maxPlayers must be 2, 3, or 4' });
      return;
    }

    const room = createRoom({
      hostPlayerId: resolved.playerId,
      hostUsername: username,
      maxPlayers: maxPlayers as 2 | 3 | 4,
      withBots,
      botDifficulty: botDifficulty || 'medium',
    });

    res.status(201).json({
      roomCode: room.code,
      guestToken: resolved.guestToken,
      playerId: resolved.playerId,
      playerColor: 'red', // Host always gets red
    });
  } catch (err) {
    console.error('[rooms] POST / error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// -------------------------------------------------------------------------
// GET /api/rooms
// List public waiting rooms
// -------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  try {
    const roomList = listPublicRooms();
    res.json({ rooms: roomList });
  } catch (err) {
    console.error('[rooms] GET / error:', err);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// -------------------------------------------------------------------------
// GET /api/rooms/:code
// Get room info
// -------------------------------------------------------------------------

router.get('/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const room = getRoom(code.toUpperCase());
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(roomToInfo(room));
  } catch (err) {
    console.error('[rooms] GET /:code error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// -------------------------------------------------------------------------
// POST /api/rooms/:code/join
// Join an existing room
// -------------------------------------------------------------------------

router.post('/:code/join', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { username: reqUsername, guestToken } = req.body as {
      username?: string;
      guestToken?: string;
    };

    const resolved = resolveGuest(guestToken);
    const username = reqUsername || resolved.username;

    const result = joinRoom(code.toUpperCase(), resolved.playerId, username);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      roomCode: result.room.code,
      guestToken: resolved.guestToken,
      playerId: resolved.playerId,
      playerColor: result.assignedColor,
    });
  } catch (err) {
    console.error('[rooms] POST /:code/join error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

export { router as roomsRouter };
