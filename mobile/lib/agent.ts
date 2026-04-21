import { z } from "zod";

const ParsedTaskSchema = z.object({
  title: z.string().min(1),
  vibeTags: z.array(z.string()).default(["#grind"]),
  dueAt: z.string().optional(),
  status: z.string().default("To Do"),
});

const ParseResponseSchema = z.object({
  tasks: z.array(ParsedTaskSchema),
  uncertain: z.boolean().default(false),
});

export type ParseResponse = z.infer<typeof ParseResponseSchema>;

export async function parseBrainDump(input: string): Promise<ParseResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  try {
    const response = await fetch(`${baseUrl}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error("Parse request failed");
    }

    const json = await response.json();
    return ParseResponseSchema.parse(json);
  } catch {
    // Keep task creation responsive even if backend is unreachable.
    const tasks = input
      .split(/\band\b|,/gi)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((title) => ({
        title: normalizeTaskTitle(title),
        vibeTags: ["#grind"],
        dueAt: inferDueAt(title),
        status: inferStatus(title),
      }));
    return {
      tasks:
        tasks.length > 0
          ? tasks
          : [{ title: normalizeTaskTitle(input), vibeTags: ["#grind"], dueAt: inferDueAt(input), status: inferStatus(input) }],
      uncertain: true,
    };
  }
}

function inferDueAt(text: string): string | undefined {
  const normalized = text.toLowerCase();
  const now = new Date();
  const inHours = normalized.match(/\bin\s+(\d+)\s*hours?\b/);
  if (inHours) {
    const hours = Number(inHours[1]);
    const d = new Date(now);
    d.setHours(d.getHours() + hours);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }

  const baseDate = inferBaseDate(normalized, now);
  if (!baseDate) return undefined;
  applyTimePhrase(baseDate, normalized, now);
  return baseDate.toISOString();
}

function inferBaseDate(normalized: string, now: Date): Date | undefined {
  if (normalized.includes("next monday")) return nextWeekday(now, 1);
  if (normalized.includes("next tuesday")) return nextWeekday(now, 2);
  if (normalized.includes("next wednesday")) return nextWeekday(now, 3);
  if (normalized.includes("next thursday")) return nextWeekday(now, 4);
  if (normalized.includes("next friday")) return nextWeekday(now, 5);
  if (normalized.includes("next saturday")) return nextWeekday(now, 6);
  if (normalized.includes("next sunday")) return nextWeekday(now, 0);

  if (normalized.includes("this weekend")) {
    const d = new Date(now);
    const diff = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  if (normalized.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (normalized.includes("today") || normalized.includes("tonight") || /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/.test(normalized)) {
    const d = new Date(now);
    d.setHours(normalized.includes("tonight") ? 20 : 17, 0, 0, 0);
    return d;
  }
  return undefined;
}

function applyTimePhrase(target: Date, normalized: string, now: Date): void {
  const atTime = normalized.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!atTime) return;
  let hour = Number(atTime[1]);
  const minute = Number(atTime[2] ?? "0");
  const meridiem = atTime[3];

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour < 7) hour += 12;

  target.setHours(hour, minute, 0, 0);
  if (target.toDateString() === now.toDateString() && target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
}

function nextWeekday(now: Date, weekday: number): Date {
  const d = new Date(now);
  const daysAhead = ((weekday - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + daysAhead);
  d.setHours(9, 0, 0, 0);
  return d;
}

function inferStatus(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("in progress") || normalized.includes("working on")) return "In Progress";
  if (normalized.includes("done") || normalized.includes("completed")) return "Completed";
  return "To Do";
}

function normalizeTaskTitle(text: string): string {
  const cleaned = text
    .replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\bthis\s+weekend\b/gi, "")
    .replace(/\btomorrow\b/gi, "")
    .replace(/\btoday\b/gi, "")
    .replace(/\btonight\b/gi, "")
    .replace(/\bin\s+\d+\s*hours?\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|for|on)\s+/i, "")
    .trim();

  if (!cleaned) return text;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
