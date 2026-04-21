import { z } from "zod";

const ParseInputSchema = z.object({
  input: z.string().min(1),
});

const ParsedTaskSchema = z.object({
  title: z.string().min(1),
  vibeTags: z.array(z.string()).default(["#grind"]),
  dueAt: z.string().optional(),
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
    title: part.charAt(0).toUpperCase() + part.slice(1),
    vibeTags: suggestTags(part),
  }));

  return ParseOutputSchema.parse({
    tasks: tasks.length > 0 ? tasks : [{ title: input, vibeTags: ["#grind"] }],
    uncertain: false,
  });
}

function suggestTags(text: string): string[] {
  const normalized = text.toLowerCase();
  if (normalized.includes("gym") || normalized.includes("workout")) return ["#grind", "#deep"];
  if (normalized.includes("buy") || normalized.includes("pickup")) return ["#errand"];
  if (normalized.includes("someday")) return ["#someday"];
  return ["#grind"];
}
