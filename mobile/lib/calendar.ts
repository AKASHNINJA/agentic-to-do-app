import { z } from "zod";

const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
});

const CalendarPreviewSchema = z.object({
  provider: z.literal("google"),
  connected: z.boolean(),
  events: z.array(CalendarEventSchema),
});
const CalendarConnectSchema = z.object({
  provider: z.literal("google"),
  connected: z.boolean(),
});
const CalendarCreateEventSchema = CalendarEventSchema;

export type CalendarPreview = z.infer<typeof CalendarPreviewSchema>;
export type CalendarConnect = z.infer<typeof CalendarConnectSchema>;
export type CalendarEvent = z.infer<typeof CalendarCreateEventSchema>;

export async function fetchGoogleCalendarPreview(): Promise<CalendarPreview> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  const response = await fetch(`${baseUrl}/calendar/google/preview`);
  if (!response.ok) throw new Error("Calendar preview failed");
  return CalendarPreviewSchema.parse(await response.json());
}

export async function connectGoogleCalendar(): Promise<CalendarConnect> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  const response = await fetch(`${baseUrl}/calendar/google/connect`, { method: "POST" });
  if (!response.ok) throw new Error("Google calendar connect failed");
  return CalendarConnectSchema.parse(await response.json());
}

export async function createGoogleCalendarEvent(input: {
  title: string;
  startAt: string;
  endAt?: string;
}): Promise<CalendarEvent> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  const response = await fetch(`${baseUrl}/calendar/google/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Google calendar create event failed");
  return CalendarCreateEventSchema.parse(await response.json());
}
