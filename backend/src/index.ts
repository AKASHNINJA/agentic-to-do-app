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

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  () => {
    console.log("Orbit backend running at http://localhost:8787");
  }
);
