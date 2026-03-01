# 🎲 GAME DESIGN DOCUMENT
# Cờ Cá Ngựa Online — Phiên bản Web/Mobile

**Version:** 1.0
**Ngày:** 2026-02-28
**Nền tảng:** Web, Android, iOS

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Cơ chế gameplay](#2-cơ-chế-gameplay)
3. [Thiết kế bảng cờ](#3-thiết-kế-bảng-cờ)
4. [Hệ thống nhân vật & skin](#4-hệ-thống-nhân-vật--skin)
5. [Chế độ chơi](#5-chế-độ-chơi)
6. [UI/UX Design](#6-uiux-design)
7. [Hệ thống kinh tế in-game](#7-hệ-thống-kinh-tế-in-game)
8. [Social Features](#8-social-features)
9. [Hệ thống xếp hạng](#9-hệ-thống-xếp-hạng)
10. [Kiến trúc kỹ thuật](#10-kiến-trúc-kỹ-thuật)
11. [Tech Stack](#11-tech-stack)
12. [Phạm vi MVP](#12-phạm-vi-mvp)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mô tả game

**Tên game:** Cờ Cá Ngựa Online
**Thể loại:** Board Game / Strategy / Multiplayer
**Đối tượng:** 6+ tuổi, mọi gia đình Việt Nam
**Số người chơi:** 2–4 người (PvP hoặc vs AI)
**Thời gian trung bình 1 ván:** 10–20 phút

Cờ Cá Ngựa là board game cổ điển của Việt Nam có nguồn gốc từ trò chơi Pachisi của Ấn Độ, truyền vào Việt Nam qua Pháp. Mỗi người chơi có 4 quân cờ hình ngựa, cần đưa tất cả về đích trước đối thủ.

### 1.2 Mục tiêu dự án

- Tái tạo trải nghiệm Cờ Cá Ngựa cổ điển trên digital platform
- Hỗ trợ chơi đa nền tảng: Web (test), Android, iOS
- Kiến trúc tách biệt Frontend / Backend
- Multiplayer realtime (WebSocket)
- MVP khả dụng trong vòng phát triển đầu tiên

---

## 2. CƠ CHẾ GAMEPLAY

### 2.1 Luật cơ bản

#### Chuẩn bị
- Bảng cờ hình vuông, chia 4 vùng màu: Đỏ, Xanh Dương, Vàng, Xanh Lá
- Mỗi người chơi: 4 quân ngựa cùng màu, đặt trong chuồng xuất phát tại góc tương ứng
- Thứ tự: Đổ xúc xắc, ai cao nhất đi trước; lượt chơi theo chiều **ngược kim đồng hồ**

#### Xúc xắc
- Sử dụng **2 xúc xắc 6 mặt**
- Server tung xúc xắc, kết quả broadcast tới tất cả player

**Tổ hợp đặc biệt (được thêm lượt):**
| Kết quả | Ý nghĩa |
|---------|---------|
| 1 + 6 | Được ra quân VÀ được tung thêm |
| Đôi bất kỳ (1+1, 2+2, ..., 6+6) | Được ra quân VÀ được tung thêm |
| Tổ hợp khác | Di chuyển bình thường, hết lượt |

**Chuỗi tung liên tiếp:** Player tiếp tục tung cho đến khi không ra tổ hợp đặc biệt.

#### Ra quân (Ra Chuồng)
- Chỉ ra quân khi tung được 1+6 hoặc đôi
- Đặt quân lên ô xuất phát của mình
- Nếu ô xuất phát đang có quân địch → đá quân địch về chuồng
- Nếu ô xuất phát đang có quân mình → chờ quân đó rời đi trước

#### Di chuyển
- Tổng 2 xúc xắc = số ô di chuyển
- Chỉ di chuyển 1 quân/lần tung
- Di chuyển theo chiều ngược kim đồng hồ
- Phải di chuyển đúng số ô, không được đi ít hơn

#### Quy tắc Cản (Blocking) — Đặc trưng Việt Nam
- Bất kỳ quân nào (kể cả quân mình) đứng trên đường di chuyển đều **cản** quân đi qua
- Không thể nhảy qua quân cản
- Nếu quân không thể di chuyển hợp lệ → chọn quân khác
- Nếu không có quân nào đi được → bỏ lượt

#### Đá Quân (Capture)
- Đi đúng vào ô có quân địch → quân địch về chuồng
- Chỉ đá được nếu tổng xúc xắc = đúng số ô đến vị trí quân địch
- **Bắt buộc đá:** Nếu có thể đá quân địch, phải đá (không được bỏ qua)
- Đá quân không được thêm lượt

#### Ô An Toàn (Safe Zones)
- Các ô được đánh dấu đặc biệt trên bảng (thường là ô có ngôi sao)
- Quân đứng trên ô an toàn KHÔNG thể bị đá
- Ô xuất phát của mỗi người cũng là ô an toàn với quân mình

#### Về Đích (Đường về chuồng)
- Sau khi đi đủ 1 vòng bảng, quân vào đường về đích (lane màu riêng)
- Đường về có 6 vị trí (1 → 6), vị trí 6 là trong cùng (đích)
- **Phải tung đúng số** để tiến vào từng ô trong đường về
  - Ví dụ: quân ở vị trí 3, cần vào vị trí 5 → phải tung ra tổng = 2
- Không thể vượt quá đích (không được tung thừa)
- Quân trong đường về KHÔNG bị đá
- 4 ô thắng: vị trí 3, 4, 5, 6

#### Thầu Mạ (Bonus Rule)
- Quân di chuyển từ ngoài bảng vào thẳng vị trí 6 trong một lần tung
- Được tính điểm/phần thưởng đặc biệt (x2 xu thắng)

#### Điều kiện thắng
- Người đưa đủ 4 quân vào đích (vị trí 3,4,5,6) trước → **THẮNG**
- Các người còn lại tiếp tục tranh hạng 2, 3, 4

### 2.2 Hệ thống Timeout & Auto-move
- Mỗi lượt: **30 giây** timer
- Hết giờ → hệ thống tự chọn quân hợp lệ đầu tiên và di chuyển
- Nếu vắng mặt liên tiếp 3 lượt → bot tiếp quản

---

## 3. THIẾT KẾ BẢNG CỜ

### 3.1 Cấu trúc bảng

```
┌─────────────────────────────────────┐
│  XANH LÁ  │  trung  │  VÀNG        │
│  chuồng   │  đường  │  chuồng      │
│           │         │              │
├───────────┤  home   ├──────────────┤
│  đường   │  zone   │  đường       │
│  chính   │  (giữa) │  chính       │
├───────────┤         ├──────────────┤
│  ĐỎ      │         │  XANH DƯƠNG  │
│  chuồng  │         │  chuồng      │
└─────────────────────────────────────┘
```

### 3.2 Thống số ô

- **Vòng ngoài:** 52 ô (13 ô × 4 cạnh)
- **Đường về đích:** 6 ô × 4 màu = 24 ô
- **Chuồng xuất phát:** 1 khu × 4 màu
- **Ô an toàn:** 8 ô trên vòng ngoài (2 ô/cạnh: ô xuất phát + 1 ô giữa)

### 3.3 Màu sắc & Thứ tự

| Người chơi | Màu | Góc | Ô xuất phát (index vòng ngoài) |
|-----------|-----|-----|-------------------------------|
| P1 | Đỏ | Dưới-Trái | 0 |
| P2 | Xanh Dương | Dưới-Phải | 13 |
| P3 | Vàng | Trên-Phải | 26 |
| P4 | Xanh Lá | Trên-Trái | 39 |

---

## 4. HỆ THỐNG NHÂN VẬT & SKIN

### 4.1 MVP — Không có hệ thống nhân vật phức tạp

Trong phiên bản MVP:
- Mỗi người chọn màu quân (Đỏ / Xanh / Vàng / Xanh Lá)
- Quân cờ dạng ngựa chibi đơn giản
- Không có skill hệ nhân vật (tránh phức tạp)

### 4.2 Phase 2 — Hệ thống Skin

- **Avatar:** Hình đại diện người chơi
- **Skin quân cờ:** Các kiểu thiết kế ngựa khác nhau
- **Skin xúc xắc:** Kiểu xúc xắc khác nhau
- **Skin bảng cờ:** Các theme bảng cờ (Cổ điển, Tết, Mùa hè...)

### 4.3 Phase 3 — Hệ thống Nhân vật (theo ZingPlay)

Nhân vật có 5 cấp độ (D, C, B, A, S) với các skill:
- **Skill di chuyển:** Double move, v.v.
- **Skill kinh tế:** Nhân đôi xu thắng
- **Skill siêu nhiên:** Đặt bom, bẫy, v.v.

---

## 5. CHẾ ĐỘ CHƠI

### 5.1 Chế độ Nhanh (Quick Match)
- Tự động ghép 2–4 người chơi
- Không cược xu
- Phù hợp người mới

### 5.2 Chế độ Phòng (Room Mode)
- Tạo phòng riêng với mã phòng
- Mời bạn bè vào
- Chủ phòng chọn: 2/3/4 người, có/không bot

### 5.3 Chế độ vs Bot
- Chơi một mình với 1–3 bot AI
- 3 cấp độ bot: Dễ, Vừa, Khó

### 5.4 Phase 2 — Giải đấu (Tournament)
- Hệ thống giải đấu hàng tuần
- Bảng xếp hạng realtime
- Phần thưởng cuối tuần

---

## 6. UI/UX DESIGN

### 6.1 Màn hình chính (Main Menu)
```
┌─────────────────────────────┐
│        CỜ CÁ NGỰA          │
│         [Logo]              │
│                             │
│  [Chơi Nhanh]              │
│  [Tạo Phòng]               │
│  [Tham gia Phòng]          │
│  [vs Bot]                  │
│                             │
│  [Bảng XH] [Shop] [Cài đặt]│
│                             │
│  Xu: 5,000 💰              │
└─────────────────────────────┘
```

### 6.2 Màn hình Game
```
┌─────────────────────────────┐
│ P4(Xanh Lá)  │ P3(Vàng)   │
│ ████░░░░     │ ████░░░░    │
│──────────────┼─────────────│
│              BOARD         │
│         [DICE AREA]        │
│                             │
│──────────────┼─────────────│
│ P1(Đỏ)      │ P2(Xanh)   │
│ ████░░░░     │ ████░░░░    │
│         [30s timer]        │
└─────────────────────────────┘
```

### 6.3 Animations cần thiết
- Lăn xúc xắc: 3D dice roll animation (0.5s)
- Di chuyển quân: Smooth path animation (0.3s/ô)
- Đá quân: Hiệu ứng va chạm + bay về chuồng (0.5s)
- Thắng: Confetti + pháo hoa (2s)
- Thầu mạ: Hiệu ứng đặc biệt vàng/lửa (1s)
- Highlight ô hợp lệ: Glow effect khi đến lượt

### 6.4 Responsive Design
- Web: Desktop 1024px+, Tablet 768px+
- Mobile: 375px+ (portrait chính, landscape hỗ trợ)
- Font: tối thiểu 14px trên mobile

---

## 7. HỆ THỐNG KINH TẾ IN-GAME

### 7.1 Tiền tệ

| Loại | Tên | Cách kiếm | Dùng để |
|------|-----|-----------|---------|
| Soft | Xu (Coins) | Chơi game, daily login | Vào phòng cược, mua item thường |
| Hard | Gem | Mua bằng tiền thật | Mua skin, nhân vật, gem chest |

### 7.2 Phần thưởng

| Sự kiện | Phần thưởng |
|---------|-------------|
| Thắng trận | +100 xu |
| Hạng 2 | +50 xu |
| Hạng 3 | +25 xu |
| Đá quân địch | +5 xu |
| Thầu mạ | +50 xu bonus |
| Daily Login | +200 xu (ngày 1), tăng dần |
| Top 1 tuần | 5,000 xu + Gem |

### 7.3 MVP — Đơn giản hóa
Trong MVP chỉ tracking xu không mua bán, mục đích test gameplay.

---

## 8. SOCIAL FEATURES

### 8.1 MVP
- Đăng nhập: Guest (không cần tài khoản), hoặc Google OAuth
- Username + Avatar mặc định
- Xem danh sách room public

### 8.2 Phase 2
- Hệ thống bạn bè
- Mời bạn vào phòng
- In-game chat (emoji + text ngắn)
- Share kết quả lên mạng xã hội

### 8.3 Phase 3
- Voice chat
- Reaction (sticker) trong game
- Gift hệ thống

---

## 9. HỆ THỐNG XẾP HẠNG

### 9.1 ELO-based Rating

| Hạng | ELO | Icon |
|------|-----|------|
| Đồng | 0–999 | 🥉 |
| Bạc | 1000–1499 | 🥈 |
| Vàng | 1500–1999 | 🥇 |
| Bạch Kim | 2000–2499 | 💎 |
| Kim Cương | 2500+ | 👑 |

### 9.2 Bảng xếp hạng
- Top 100 người chơi theo điểm ELO
- Reset hàng tuần (Season)
- Top 10 nhận phần thưởng đặc biệt

---

## 10. KIẾN TRÚC KỸ THUẬT

### 10.1 Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                              │
│  [Web Browser]  [Android App]  [iOS App]               │
│       │               │              │                  │
│       └───────────────┴──────────────┘                  │
│                       │                                 │
│              [API Gateway / Load Balancer]              │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────┐              ┌─────────▼──────┐
│  REST API    │              │  WebSocket     │
│  Server      │              │  Server        │
│  (Auth,      │              │  (Game Engine, │
│   Profile,   │              │   Realtime     │
│   Leaderboard│              │   Events)      │
└───────┬──────┘              └────────┬───────┘
        │                              │
        └──────────────┬───────────────┘
                       │
              ┌────────▼────────┐
              │   Database      │
              │  PostgreSQL     │
              │  + Redis        │
              └─────────────────┘
```

### 10.2 Frontend Architecture

```
frontend/
├── apps/
│   ├── web/              # Next.js (Web + PWA)
│   └── mobile/           # React Native (Android + iOS)
├── packages/
│   ├── game-engine/      # Core game logic (shared)
│   ├── ui/               # Shared UI components
│   └── api-client/       # API + WebSocket client
```

**Web App (Next.js):**
- Server-Side Rendering cho SEO và load nhanh
- WebSocket client cho realtime
- Canvas/Three.js cho game board animation
- PWA support (offline capability)

**Mobile App (React Native + Expo):**
- Dùng chung game-engine package với Web
- React Native Skia cho game rendering
- Expo EAS Build → xuất APK/IPA
- Push Notification qua Expo Notifications

### 10.3 Backend Architecture

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/         # Xác thực
│   │   ├── users/        # Profile, settings
│   │   ├── rooms/        # Phòng chơi
│   │   ├── game/         # Game engine (server-side)
│   │   ├── leaderboard/  # Bảng xếp hạng
│   │   └── economy/      # Xu, phần thưởng
│   ├── websocket/        # WebSocket handlers
│   ├── queue/            # Job queue (BullMQ)
│   └── database/         # DB migrations, seeds
```

**Game Engine (Server-side) — luật chơi:**
- Tất cả logic game chạy trên server để chống gian lận
- Server tung xúc xắc (không client)
- Server validate mọi move
- Server broadcast state tới tất cả client

### 10.4 Realtime Flow (WebSocket)

```
Client                          Server
  │                               │
  │──── JOIN_ROOM ──────────────→ │ Xác nhận room, gửi state
  │ ←── ROOM_STATE ─────────────  │
  │                               │
  │──── ROLL_DICE ──────────────→ │ Server tung xúc xắc
  │ ←── DICE_RESULT (to all) ───  │ Broadcast kết quả
  │                               │
  │──── MOVE_PIECE {id, target}─→ │ Validate move
  │ ←── GAME_STATE (to all) ────  │ Broadcast state mới
  │                               │
  │ ←── GAME_OVER {rankings} ───  │ Kết thúc game
```

### 10.5 Database Schema (PostgreSQL)

```sql
-- Users
users: id, username, email, avatar_url, elo, coins, gems, created_at

-- Game Sessions
game_sessions: id, room_code, status, mode, created_at, ended_at, winner_id

-- Game Players
game_players: id, session_id, user_id, color, rank, coins_earned

-- Game Moves (audit log)
game_moves: id, session_id, player_id, move_type, piece_id, from_pos, to_pos, dice_val, timestamp

-- Leaderboard (weekly)
leaderboard_seasons: id, user_id, season_week, elo_points, rank
```

---

## 11. TECH STACK

### 11.1 Frontend

| Layer | Technology | Lý do chọn |
|-------|-----------|------------|
| Web Framework | **Next.js 14** (App Router) | SSR, SEO, DX tốt |
| Mobile Framework | **React Native + Expo** | Cross-platform, code sharing |
| Language | **TypeScript** | Type safety |
| Game Rendering (Web) | **Pixi.js** hoặc **Canvas API** | Performance 2D |
| Game Rendering (Mobile) | **React Native Skia** | High-perf mobile rendering |
| State Management | **Zustand** | Lightweight, simple |
| Styling (Web) | **Tailwind CSS** | Rapid UI dev |
| Styling (Mobile) | **NativeWind** | Tailwind cho RN |
| WebSocket Client | **Socket.io-client** | Reliable WS |
| Animation | **Framer Motion** (web) / **Reanimated 3** (mobile) | Smooth animations |

### 11.2 Backend

| Layer | Technology | Lý do chọn |
|-------|-----------|------------|
| Runtime | **Node.js 20** | JS ecosystem, npm |
| Framework | **NestJS** | Structured, scalable |
| Language | **TypeScript** | Type safety |
| WebSocket | **Socket.io** | Reliable, fallback support |
| Database | **PostgreSQL** | Relational, ACID |
| ORM | **Prisma** | Type-safe, migration |
| Cache/Session | **Redis** | Fast, pub/sub cho WS |
| Auth | **JWT + Passport.js** | Standard, secure |
| Job Queue | **BullMQ** | Background jobs |
| Validation | **class-validator** | DTO validation |

### 11.3 Infrastructure & DevOps

| Layer | Technology |
|-------|-----------|
| Containerization | Docker + Docker Compose |
| Mobile Build | Expo EAS Build |
| CI/CD | GitHub Actions |
| Hosting (Web) | Vercel (frontend) + Railway/Render (backend) |
| Database Hosting | Supabase hoặc Railway PostgreSQL |
| Redis Hosting | Upstash Redis |

### 11.4 Monorepo Setup

```
co-ca-ngua/
├── apps/
│   ├── web/                    # Next.js web app
│   └── mobile/                 # React Native / Expo app
├── packages/
│   ├── game-core/              # Game logic (pure TS, shared)
│   ├── ui-web/                 # Web UI components
│   └── shared-types/           # TypeScript types/interfaces
├── backend/                    # NestJS backend
├── docker-compose.yml
└── package.json                # Turborepo
```

---

## 12. PHẠM VI MVP

### 12.1 MVP Features (Phase 1)

**Backend:**
- [x] Auth: Guest login (auto-generate username)
- [x] Room: Tạo/Tham gia phòng (2–4 người)
- [x] Game Engine: Đầy đủ luật cờ cá ngựa
- [x] WebSocket: Realtime game state sync
- [x] Bot AI: Cấp độ dễ/vừa

**Frontend Web:**
- [x] Lobby: Danh sách phòng, tạo/vào phòng
- [x] Game Board: Render bảng cờ 2D
- [x] Dice Animation: Lăn xúc xắc
- [x] Piece Movement: Animation di chuyển quân
- [x] Game Over Screen: Kết quả, xếp hạng

**Frontend Mobile:**
- [x] Cùng tính năng với Web
- [x] Build APK (Android) qua Expo EAS
- [x] Build IPA (iOS) qua Expo EAS

### 12.2 Phase 2 (Post-MVP)

- Google OAuth login
- Hệ thống xu & phần thưởng
- Bảng xếp hạng ELO
- Skin quân cờ / bảng cờ
- Hệ thống bạn bè
- In-game chat

### 12.3 Phase 3

- Hệ thống nhân vật với skill
- Giải đấu hàng tuần
- IAP (in-app purchase)
- Voice chat

---

## TIMELINE ĐỀ XUẤT (MVP)

| Week | Công việc |
|------|-----------|
| W1 | Setup monorepo, Backend: Auth, Room API, DB schema |
| W2 | Backend: Game Engine core logic, WebSocket |
| W3 | Backend: Bot AI, Testing game logic |
| W4 | Frontend Web: Layout, Board rendering, Dice |
| W5 | Frontend Web: Game flow hoàn chỉnh, tích hợp WS |
| W6 | Frontend Mobile: Port từ web, cấu hình Expo |
| W7 | Testing tổng hợp, Bug fix, Polish UI |
| W8 | Deploy, Build APK/IPA, Release |

---

*Document này sẽ được cập nhật khi có thay đổi trong quá trình phát triển.*
