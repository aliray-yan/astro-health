import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

export const runtime = "nodejs";

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .describe(
      "2-3 plain-language sentences explaining what changed and why it plausibly happened, for a non-clinician astronaut reading it on a wearable-style dashboard.",
    ),
  suggested_action: z
    .string()
    .describe("1-2 concrete, practical next steps the astronaut can take right now."),
  urgency: z
    .enum(["routine", "monitor", "act_soon"])
    .describe(
      "routine = within personal norm just flagged by sensitivity; monitor = worth watching over the next day or two; act_soon = warrants a call to flight surgeon/ground support soon.",
    ),
});

interface ExplainRequestBody {
  indicator: string;
  label: string;
  hazard: string;
  day: number;
  value: number;
  unit: string;
  expected_value: number | null;
  injected_anomaly: string | null;
  description?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY is not set. Add it to .env.local (see .env.example) to enable live AI explanations.",
      },
      { status: 501 },
    );
  }

  let payload: ExplainRequestBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { indicator, label, hazard, day, value, unit, expected_value, injected_anomaly, description } =
    payload;

  if (!indicator || !label || value === undefined || day === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: indicator, label, day, value." },
      { status: 400 },
    );
  }

  const deviation =
    expected_value !== null && expected_value !== undefined
      ? value - expected_value
      : null;

  const openrouter = createOpenRouter({ apiKey });

  const prompt = [
    `Mission day ${day}. Indicator: ${label} (${hazard} hazard category).`,
    description ? `What it measures: ${description}` : null,
    `Flagged reading: ${value} ${unit}.`,
    expected_value !== null && expected_value !== undefined
      ? `Expected value from this astronaut's personal baseline trend: ${expected_value.toFixed(2)} ${unit} (deviation: ${deviation !== null ? (deviation > 0 ? "+" : "") + deviation.toFixed(2) : "unknown"} ${unit}).`
      : `No personal-baseline expected value was available for comparison.`,
    injected_anomaly
      ? `Simulated event on this reading: ${injected_anomaly}.`
      : `This deviation was flagged by the anomaly detector against the astronaut's own trend, not injected as a scripted event.`,
    `Explain this to the astronaut in plain language and suggest what to do next.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: openrouter("openrouter/free"),
      schema: ExplanationSchema,
      system:
        "You are a calm, plain-spoken flight-surgeon-trained assistant embedded in an astronaut's personal health dashboard during a long-duration mission. " +
        "You explain flagged physiological readings against the astronaut's OWN personal baseline (not generic population norms) in clear, non-alarmist language a non-clinician can act on immediately. " +
        "Never invent numbers you were not given. Keep the explanation short and calibrated to the actual severity of the deviation — most flags are minor and routine, not emergencies.",
      prompt,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("OpenRouter explain call failed:", err);
    return NextResponse.json(
      { error: "The AI explanation service failed. Check OPENROUTER_API_KEY and try again." },
      { status: 502 },
    );
  }
}
