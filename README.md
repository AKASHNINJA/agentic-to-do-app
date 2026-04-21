# Agentic To Do App (Orbit)

PRD-driven MVP scaffold for a game-like, agentic to-do app.

## Install
### Prerequisites
- Node.js 20+
- npm 10+
- Expo Go app on a physical device (recommended)

### 1) Clone and install dependencies
```powershell
git clone https://github.com/AKASHNINJA/agentic-to-do-app.git
cd agentic-to-do-app
cd backend
npm install
cd ..\mobile
npm install
```

### 2) Run backend API
```powershell
cd backend
npm run dev
```

### 3) Run mobile app
```powershell
cd mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8787"
npm start
```

Then open the app with Expo Go (scan QR code), or press `a` / `i` in Expo CLI for Android/iOS simulators.

## Features (Current MVP)
- **Brain dump input (text):** type free-form thoughts and submit from the home screen.
- **Agent parsing pipeline:** mobile sends input to backend `/parse`, response is validated with Zod before rendering.
- **Task cards with gestures:** swipe right to complete, swipe left to snooze.
- **Momentum planet:** Skia-rendered glowing planet that grows with completion momentum.
- **Strict TypeScript setup:** strict mode enabled in mobile and backend.
- **Motion constants:** animation and spring values are centralized in `mobile/constants/motion.ts`.

## Architecture
- **Mobile (`mobile/`)**
  - Expo + React Native app shell
  - Zustand state store (`mobile/store/useOrbitStore.ts`)
  - Gesture handling (`react-native-gesture-handler`)
  - Animation (`react-native-reanimated`)
  - Planet visualization (`@shopify/react-native-skia`)
  - API client + response validation (`mobile/lib/agent.ts`)

- **Backend (`backend/`)**
  - Hono server exposing `/health` and `/parse`
  - Parsing module with schema-first validation (`backend/src/agent/parse.ts`)
  - Zod input/output contracts for safe agent output handling

- **Product docs (`docs/`)**
  - MVP scope and acceptance criteria in `docs/specs/orbit-mvp.md`

## Project Structure
- `mobile/` - React Native app
- `backend/` - Hono API
- `docs/specs/` - feature and MVP specs

## Validation Commands
```powershell
# Mobile type check
cd mobile
npx tsc --noEmit

# Backend build/type check
cd ..\backend
npm run build
```
