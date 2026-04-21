# Agentic To Do App (Orbit)

PRD-driven MVP scaffold for a game-like, agentic to-do app.

## Structure
- `mobile/` Expo React Native app (home screen, brain dump, task gestures, momentum planet)
- `backend/` Hono API with strict Zod parsing contract
- `docs/specs/orbit-mvp.md` MVP acceptance criteria

## Run
### Backend
```powershell
cd backend
npm run dev
```

### Mobile
```powershell
cd mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8787"
npm start
```
