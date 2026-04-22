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
- **Agentic parsing:** phrases like `tomorrow`, `next monday`, `this weekend`, `in 2 hours`, `at 7 pm`, bare weekday names (`Running Monday`), and preposition forms (`on Friday`, `by Tuesday`) are parsed into due dates.
- **Clean task titles:** leading/trailing connectors and date phrases are stripped (e.g. `running on next monday` -> `Running` scheduled for next Monday).
- **Auto-jump to due date:** creating a task automatically selects its due day in Week/Calendar views so it's immediately visible.
- **Inline date picker:** quick chips (`Today`, `Tomorrow`, `+2d`, `+3d`, `Next Mon`), a native HTML date input on web, and a `Clear` pill. An explicit picked date overrides natural language.
- **Status tracking:** segmented tabs for `To Do`, `In Progress`, `Completed` with per-task status changers.
- **Task actions:** complete, snooze, and delete on each task card.
- **View modes:** `List View`, `Week View`, and `Calendar View`.
- **Calendar tiles with context art:** each day is a gradient tile with a context emoji (running, study, meeting, shopping, family, cooking, coding, travel, writing, cleaning, music), weekday label, first-task preview, a count badge, and today/selected highlighting.
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

## Date Input Cheatsheet
Orbit accepts dates three different ways — pick whichever is fastest:

1. **Natural language in the text input**
   - `running tomorrow at 7am`
   - `study friday`
   - `call mom this weekend`
   - `ship release in 2 hours`
   - `running on next monday` (prepositions are stripped, title becomes `Running`)
2. **Date chips** above the input bar: `Today`, `Tomorrow`, `+2d`, `+3d`, `Next Mon`, `Clear`.
3. **Native date input** (web): click the date field to open the browser's calendar picker.

If you pick a date via chips or the native picker, it overrides any natural-language date in the text. After creation, the Week and Calendar views automatically jump to that day so the new task is visible.

## Upcoming Features
- **Google Calendar (full integration):**
  - Real Google OAuth sign-in flow (replacing the current preview/mock backend).
  - Two-way sync: edits on tasks update linked GCal events and vice versa.
  - Smart time-blocking: agent suggests calendar slots based on free time + task energy.
  - Per-calendar selection for import and auto-create targets.
- **CLI Friendly App:**
  - First-class `orbit` command-line tool to manage tasks without opening the UI.
  - Natural language task creation: `orbit add "running tomorrow at 7am"`.
  - Quick listing and filtering: `orbit list --today`, `orbit list --status "In Progress"`.
  - Status and delete commands: `orbit done <id>`, `orbit rm <id>`.
  - GCal workflow from the shell: `orbit gcal connect`, `orbit gcal import`.
  - Pipe-friendly output (JSON mode) for scripting and automation.

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
