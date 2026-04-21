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

## Features (Current Build)
- **Brain dump + Enter submit:** type free-form input and press Enter/Return or `Create Task`.
- **Agentic parsing:** phrases like `tomorrow`, `next monday`, `this weekend`, `in 2 hours`, `at 7 pm` are parsed into due dates.
- **Clean task titles:** date/time phrases are removed from task names (e.g. `running tomorrow` -> `Running` on tomorrow).
- **Status tracking:** segmented tabs for `To Do`, `In Progress`, `Completed` with per-task status changers.
- **Task actions:** complete, snooze, and delete on each task card.
- **View modes:** `List View`, `Week View`, and `Calendar View`.
- **Calendar tiles:** day tiles show context visuals from task content.
- **Google Calendar integration controls:** connect/reconnect account, import events, and auto-create events toggle.
- **Auto event sync:** when connected and enabled, new tasks create calendar events.
- **3D cyberpunk UI:** segmented panels, depth/parallax motion, completion burst, momentum hero visuals.
- **Strict TypeScript setup:** strict mode enabled in mobile and backend.
- **Motion constants:** animation and spring values are centralized in `mobile/constants/motion.ts`.
- **Theme tokens:** centralized theme tokens in `mobile/constants/theme.ts`.

## Architecture
- **Mobile (`mobile/`)**
  - Expo + React Native app shell
  - Zustand state store (`mobile/store/useOrbitStore.ts`)
  - Gesture handling (`react-native-gesture-handler`)
  - Animation (`react-native-reanimated`)
  - Planet visualization (`@shopify/react-native-skia`)
  - API client + response validation (`mobile/lib/agent.ts`)

- **Backend (`backend/`)**
  - Hono server exposing `/health`, `/parse`, and Google Calendar integration endpoints
  - Parsing module with schema-first validation (`backend/src/agent/parse.ts`)
  - Zod input/output contracts for safe agent output handling

- **Product docs (`docs/`)**
  - MVP scope and acceptance criteria in `docs/specs/orbit-mvp.md`

## Project Structure
- `mobile/` - React Native app
- `backend/` - Hono API
- `docs/specs/` - feature and MVP specs

## Roadmap
- Prioritized roadmap for the 20 expansion features:
  - `docs/specs/orbit-roadmap.md`

## Validation Commands
```powershell
# Mobile type check
cd mobile
npx tsc --noEmit

# Backend build/type check
cd ..\backend
npm run build
```
