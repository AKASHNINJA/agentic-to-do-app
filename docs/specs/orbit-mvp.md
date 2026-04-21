# Orbit MVP Spec

## Goal
Deliver the first user loop: open app, dump one thought, parse into tasks, and visualize momentum.

## Acceptance Criteria
- Expo app boots directly to home with live brain dump input.
- User can submit text and receive parsed tasks without additional screens.
- Task cards support swipe-right complete and swipe-left snooze.
- Momentum planet renders and changes with completion activity.
- Backend exposes `/parse` endpoint and validates response shape with Zod.
- TypeScript strict mode is enabled in both mobile and backend projects.

## Notes
- This is the v1 scaffold aligned to the PRD build order.
- Voice, workflow scheduling, and integrations are scaffold targets for the next iterations.
