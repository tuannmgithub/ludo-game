# 🎲 Cờ Cá Ngựa Online

Phiên bản digital của trò chơi dân gian Cờ Cá Ngựa Việt Nam — chạy trên Web, Android và iOS.

---

## Kiến trúc tổng quan

```
co-ca-ngua/
├── apps/
│   ├── web/            → Next.js 14  (Web app, port 3000)
│   └── mobile/         → Expo React Native (Android + iOS)
├── packages/
│   ├── shared-types/   → TypeScript types dùng chung
│   └── game-core/      → Game logic thuần (engine, bot AI)
├── backend/            → Express + Socket.io (API, port 3001)
└── docker-compose.yml  → Deploy production
```

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS, Socket.io client |
| Mobile | Expo SDK 51, React Native, react-native-svg, NativeWind |
| Backend | Express.js, Socket.io, JWT, TypeScript |
| Game Logic | Pure TypeScript (shared between FE + BE) |
| State | Zustand (frontend), In-memory Map (backend) |
| Build Mobile | Expo EAS Build → APK/IPA |

---

## Yêu cầu

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Expo CLI** (để chạy mobile): `npm install -g expo-cli`

---

## Chạy nhanh (Development)

### 1. Cài dependencies

```bash
cd /Users/lap16359-local/codetest/ludo
pnpm install
```

### 2. Chạy Backend

```bash
cd backend
pnpm dev
# Server chạy tại http://localhost:3001
# Health check: http://localhost:3001/health
```

### 3. Chạy Web (để test game)

```bash
cd apps/web
pnpm dev
# Mở http://localhost:3000
```

### 4. Chạy Mobile (Expo)

```bash
cd apps/mobile
# Thêm ảnh placeholder vào assets/ (xem assets/README.md)
pnpm start
# Quét QR code bằng Expo Go app trên điện thoại
```

---

## Chơi thử ngay (Web)

1. Mở terminal 1: `cd backend && pnpm dev`
2. Mở terminal 2: `cd apps/web && pnpm dev`
3. Mở **http://localhost:3000** trên trình duyệt
4. Tạo phòng và chơi với bot hoặc mở tab khác để chơi 2 người

---

## Build Production

### Backend (Docker)

```bash
cd backend
docker build -t co-ca-ngua-backend .
docker run -p 3001:3001 -e JWT_SECRET=your-secret co-ca-ngua-backend
```

### Web (Docker)

```bash
cd apps/web
docker build -t co-ca-ngua-web .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-backend.com \
  -e NEXT_PUBLIC_WS_URL=https://your-backend.com \
  co-ca-ngua-web
```

### Hoặc dùng Docker Compose

```bash
# Từ root directory
docker-compose up --build
```

---

## Build Mobile (APK/IPA)

### Android APK

```bash
cd apps/mobile

# Cài EAS CLI
npm install -g eas-cli

# Đăng nhập Expo account
eas login

# Build APK (preview)
eas build --platform android --profile preview

# Hoặc build local (cần Android SDK)
npx expo run:android
```

### iOS IPA

```bash
cd apps/mobile

# Build IPA (cần Apple Developer account)
eas build --platform ios --profile production

# Hoặc chạy simulator (cần macOS + Xcode)
npx expo run:ios
```

> **Lưu ý iOS**: Cần Apple Developer Account ($99/năm) để build IPA thực sự.
> Để test: dùng Expo Go app + `npx expo start`.

---

## API Reference

### REST Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/auth/guest` | Tạo tài khoản khách (auto username) |
| `POST` | `/api/rooms` | Tạo phòng mới |
| `GET`  | `/api/rooms` | Danh sách phòng public |
| `GET`  | `/api/rooms/:code` | Chi tiết phòng |
| `POST` | `/api/rooms/:code/join` | Tham gia phòng |
| `GET`  | `/health` | Health check |

### WebSocket Events

**Client → Server:**
| Event | Payload | Mô tả |
|-------|---------|-------|
| `join_room` | `{ roomCode, username, guestToken, playerId }` | Vào phòng |
| `start_game` | — | Bắt đầu game (host only) |
| `roll_dice` | — | Tung xúc xắc |
| `move_piece` | `{ pieceId: number }` | Di chuyển quân |
| `leave_room` | — | Rời phòng |

**Server → Client:**
| Event | Payload | Mô tả |
|-------|---------|-------|
| `room_joined` | `{ gameState, playerColor, playerId }` | Đã vào phòng |
| `player_joined` | `{ gameState }` | Người chơi mới |
| `game_started` | `{ gameState }` | Game bắt đầu |
| `dice_rolled` | `{ gameState }` | Kết quả xúc xắc + valid moves |
| `piece_moved` | `{ gameState }` | Quân đã di chuyển |
| `game_over` | `{ gameState }` | Game kết thúc |
| `player_left` | `{ gameState, playerColor }` | Người chơi thoát |
| `error` | `{ message, code? }` | Lỗi |

---

## Luật chơi (tóm tắt)

| Quy tắc | Cờ Cá Ngựa VN | Ludo quốc tế |
|---------|--------------|-------------|
| Xúc xắc | **2 xúc xắc** | 1 xúc xắc |
| Ra quân | **Đôi HOẶC 1+6** | Chỉ số 6 |
| Lượt thêm | Mọi đôi + 1+6 | Chỉ số 6 |
| Luật cản | **1 quân bất kỳ** | Cần 2 cùng màu |
| Bắt buộc đá | **Có** | Không |
| Về đích | **Phải tung đúng số** | Tự do |
| Thầu Mạ | Vào thẳng đích = bonus | Không có |
| Chiều đi | **Ngược kim đồng hồ** | Theo chiều kim |

---

## Cấu trúc GameState

```typescript
interface GameState {
  sessionId: string;
  roomCode: string;
  players: Player[];           // 2-4 players
  currentPlayerColor: PlayerColor | null;
  status: 'waiting' | 'playing' | 'finished';
  dice: DiceResult | null;     // null = chưa tung
  validMoves: ValidMove[];     // quân có thể đi
  rankings: PlayerColor[];     // thứ tự về đích
  hasExtraTurn: boolean;       // được tung thêm
  turnStartedAt: number;       // timestamp (timeout 30s)
}

// Vị trí quân:
// -1     = trong chuồng (stable)
// 0-51   = trên bảng (main track)
// 52-57  = đường về đích (57 = đích)
```

---

## Phát triển thêm (Roadmap)

- [ ] **Phase 2**: Google OAuth, hệ thống xu, bảng xếp hạng ELO
- [ ] **Phase 3**: Skin quân cờ, hệ thống nhân vật với skill
- [ ] **Phase 4**: Giải đấu hàng tuần, IAP (in-app purchase)

---

## Troubleshooting

**`pnpm: command not found`**
```bash
npm install -g pnpm
```

**CORS error khi chạy web**
Đảm bảo backend đang chạy tại `localhost:3001`. Kiểm tra `.env.local` trong `apps/web/`.

**Mobile không kết nối được backend**
Thay `localhost` bằng IP máy tính của bạn trong `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:3001
EXPO_PUBLIC_WS_URL=http://192.168.1.x:3001
```

**Expo build lỗi assets**
Tạo placeholder images trước khi build (xem `apps/mobile/assets/README.md`).
