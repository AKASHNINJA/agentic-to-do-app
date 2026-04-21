import { z } from "zod";

const ParsedTaskSchema = z.object({
  title: z.string().min(1),
  vibeTags: z.array(z.string()).default(["#grind"]),
  dueAt: z.string().optional(),
});

const ParseResponseSchema = z.object({
  tasks: z.array(ParsedTaskSchema),
  uncertain: z.boolean().default(false),
});

export type ParseResponse = z.infer<typeof ParseResponseSchema>;

export async function parseBrainDump(input: string): Promise<ParseResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
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
}
