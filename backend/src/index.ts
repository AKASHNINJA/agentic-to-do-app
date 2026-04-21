import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { parseBrainDump, validateInput } from "./agent/parse";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/parse", async (c) => {
  const payload = validateInput(await c.req.json());
  const parsed = await parseBrainDump(payload.input);
  return c.json(parsed);
});

app.get("/calendar/google/preview", (c) => {
  const now = Date.now();
  return c.json({
    provider: "google",
    connected: false,
    events: [
      {
        id: "evt-1",
        title: "Mock: Team standup",
        startAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "evt-2",
        title: "Mock: Deep work block",
        startAt: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(now + 28 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
});

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  () => {
    console.log("Orbit backend running at http://localhost:8787");
  }
);
