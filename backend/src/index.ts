import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { parseBrainDump, validateInput } from "./agent/parse";

const app = new Hono();
app.use("*", cors());
let googleConnected = false;
const googleEvents: { id: string; title: string; startAt: string; endAt: string }[] = [];

app.get("/health", (c) => c.json({ ok: true }));

app.post("/parse", async (c) => {
  const payload = validateInput(await c.req.json());
  const parsed = await parseBrainDump(payload.input);
  return c.json(parsed);
});

app.get("/calendar/google/preview", (c) => {
  return c.json({
    provider: "google",
    connected: googleConnected,
    events: googleEvents,
  });
});

app.post("/calendar/google/connect", (c) => {
  googleConnected = true;
  return c.json({
    provider: "google",
    connected: true,
  });
});

app.post("/calendar/google/events", async (c) => {
  if (!googleConnected) {
    return c.json({ error: "Google Calendar not connected" }, 400);
  }
  const body = (await c.req.json()) as { title?: string; startAt?: string; endAt?: string };
  if (!body.title || !body.startAt) {
    return c.json({ error: "title and startAt are required" }, 400);
  }
  const event = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: body.title,
    startAt: body.startAt,
    endAt: body.endAt ?? new Date(new Date(body.startAt).getTime() + 60 * 60 * 1000).toISOString(),
  };
  googleEvents.unshift(event);
  return c.json(event);
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
