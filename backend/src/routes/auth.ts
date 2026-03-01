import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { GuestTokenPayload } from '../types';
import { generateUsername } from '../room-manager';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/auth/guest
 * Creates a guest identity with a JWT token.
 * Response: { guestToken, playerId, username }
 */
router.post('/guest', (_req: Request, res: Response) => {
  try {
    const playerId = uuidv4();
    const username = generateUsername();

    const payload: GuestTokenPayload = { playerId, username };
    const guestToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({ guestToken, playerId, username });
  } catch (err) {
    console.error('[auth/guest] Error:', err);
    res.status(500).json({ error: 'Failed to create guest token' });
  }
});

export { router as authRouter };
export { JWT_SECRET };
