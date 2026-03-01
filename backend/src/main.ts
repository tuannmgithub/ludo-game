import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { roomsRouter } from './routes/rooms';
import { setupSocketHandlers } from './socket-handler';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// -------------------------------------------------------------------------
// Middleware
// -------------------------------------------------------------------------

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------------------
// REST Routes
// -------------------------------------------------------------------------

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// -------------------------------------------------------------------------
// Socket.io
// -------------------------------------------------------------------------

setupSocketHandlers(io);

// -------------------------------------------------------------------------
// Start server
// -------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer, io };
