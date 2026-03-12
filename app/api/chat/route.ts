import OpenAI from "openai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { NOVICE_SYSTEM_PROMPT } from "@/src/lib/prompts/novice";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const requestSchema = z.object({
  task: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.union([z.literal("user"), z.literal("assistant")]),
      content: z.string(),
    }),
  ),
});

const responseSchema = z.object({
  assistantMessage: z.string(),
  codeDraft: z.string(),
  knowledgeState: z.object({
    concepts: z.array(z.string()),
    misconceptions: z.array(z.string()),
    openQuestions: z.array(z.string()),
    confidence: z.record(z.string(), z.number()),
  }),
});

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        (part as { type?: string }).type === "text" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("");
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in environment." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsedRequest.error.flatten() },
      { status: 400 },
    );
  }

  const { task, messages } = parsedRequest.data;

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: NOVICE_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Current task: ${task}`,
        },
        ...messages,
      ],
    });

    const message = completion.choices[0]?.message;
    const raw =
      extractTextContent(message?.content) ??
      (typeof message?.refusal === "string" ? message.refusal : "");
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON.", raw },
        { status: 502 },
      );
    }

    const parsedResponse = responseSchema.safeParse(parsedJson);
    if (!parsedResponse.success) {
      return NextResponse.json(
        {
          error: "Model JSON failed schema validation.",
          details: parsedResponse.error.flatten(),
          raw,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    const fallbackMessage =
      error instanceof Error ? error.message : "Unknown error";
    const maybeApiError = error as {
      status?: number;
      code?: string;
      type?: string;
      message?: string;
      error?: { message?: string; type?: string; code?: string };
    };
    const providerMessage =
      maybeApiError?.error?.message ?? maybeApiError?.message ?? fallbackMessage;
    const providerType = maybeApiError?.error?.type ?? maybeApiError?.type;
    const providerCode = maybeApiError?.error?.code ?? maybeApiError?.code;
    const statusCode =
      typeof maybeApiError?.status === "number" ? maybeApiError.status : 500;
    const isQuotaError =
      providerCode === "insufficient_quota" || providerType === "insufficient_quota";
    const actionHint = isQuotaError
      ? "OpenAI API quota exceeded. Add billing/credits or use a different API key/project."
      : undefined;

    // Keep a full server log for local debugging in the Next.js terminal.
    console.error("POST /api/chat failed", {
      status: maybeApiError?.status,
      code: providerCode,
      type: providerType,
      message: providerMessage,
      error,
    });

    return NextResponse.json(
      {
        error: "Chat request failed.",
        details: providerMessage,
        code: providerCode,
        type: providerType,
        hint: actionHint,
      },
      { status: statusCode },
    );
  }
}
