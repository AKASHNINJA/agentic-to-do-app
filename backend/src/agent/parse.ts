import { z } from "zod";

const ParseInputSchema = z.object({
  input: z.string().min(1),
});

const ParsedTaskSchema = z.object({
  title: z.string().min(1),
  vibeTags: z.array(z.string()).default(["#grind"]),
  dueAt: z.string().optional(),
  status: z.string().default("To Do"),
});

const ParseOutputSchema = z.object({
  tasks: z.array(ParsedTaskSchema).min(1),
  uncertain: z.boolean().default(false),
});

export type ParseInput = z.infer<typeof ParseInputSchema>;
export type ParseOutput = z.infer<typeof ParseOutputSchema>;

export function validateInput(value: unknown): ParseInput {
  return ParseInputSchema.parse(value);
}

export async function parseBrainDump(input: string): Promise<ParseOutput> {
  const pieces = input
    .split(/\band\b|,/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  const tasks = pieces.map((part) => ({
    title: normalizeTaskTitle(part),
    vibeTags: suggestTags(part),
    dueAt: inferDueAt(part),
    status: inferStatus(part),
  }));

  return ParseOutputSchema.parse({
    tasks:
      tasks.length > 0
        ? tasks
        : [{ title: normalizeTaskTitle(input), vibeTags: ["#grind"], dueAt: inferDueAt(input), status: inferStatus(input) }],
    uncertain: false,
  });
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
  const weekdayMatch = normalized.match(/\b(?:next\s+|on\s+(?:next\s+)?|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const map: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const target = map[weekdayMatch[1]];
    if (target !== undefined) return nextWeekday(now, target);
  }

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

function suggestTags(text: string): string[] {
  const normalized = text.toLowerCase();
  if (normalized.includes("gym") || normalized.includes("workout")) return ["#grind", "#deep"];
  if (normalized.includes("buy") || normalized.includes("pickup")) return ["#errand"];
  if (normalized.includes("someday")) return ["#someday"];
  return ["#grind"];
}

function normalizeTaskTitle(text: string): string {
  const prep = "(?:on|at|by|for|to|from|this|on\\s+the)";
  const cleaned = text
    .replace(new RegExp(`\\b${prep}\\s+next\\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b`, "gi"), "")
    .replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(new RegExp(`\\b${prep}\\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b`, "gi"), "")
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\bthis\s+weekend\b/gi, "")
    .replace(/\b(tomorrow|today|tonight)\b/gi, "")
    .replace(/\bin\s+\d+\s*hours?\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|for|on|at|by)\s+/i, "")
    .replace(/\s+(on|at|by|for|to|from|this|next)$/i, "")
    .trim();

  if (!cleaned) return text.charAt(0).toUpperCase() + text.slice(1);
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
