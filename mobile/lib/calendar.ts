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

export type CalendarPreview = z.infer<typeof CalendarPreviewSchema>;

export async function fetchGoogleCalendarPreview(): Promise<CalendarPreview> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  const response = await fetch(`${baseUrl}/calendar/google/preview`);
  if (!response.ok) throw new Error("Calendar preview failed");
  return CalendarPreviewSchema.parse(await response.json());
}
