import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type LlmProvider = "gemini" | "openai";

const SYNTHESIS_GEMINI_PRIMARY = "gemini-2.5-flash-lite";
const SYNTHESIS_GEMINI_FALLBACK = "gemini-2.5-flash";
const SYNTHESIS_RETRIES_PER_MODEL = 2;
const SYNTHESIS_RETRY_DELAY_MS = 1500;
const PLACEHOLDER = /^(xxx+|changeme|your[-_]?)/i;

function isRealKey(key: string | undefined, minLen = 10): key is string {
  if (!key || key.length < minLen) return false;
  if (PLACEHOLDER.test(key)) return false;
  return true;
}

function resolveOpenAiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!isRealKey(key)) return undefined;
  if (/^sk-your/i.test(key)) return undefined;
  return key;
}

function resolveGeminiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!isRealKey(key, 20)) return undefined;
  return key;
}

let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

export function getOpenAI(): OpenAI | null {
  const key = resolveOpenAiKey();
  if (!key) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

function getGemini(): GoogleGenerativeAI | null {
  const key = resolveGeminiKey();
  if (!key) return null;
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(key);
  return geminiClient;
}

export function resolveLlmProvider(): LlmProvider | null {
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" && resolveOpenAiKey()) return "openai";
  if (forced === "gemini" && resolveGeminiKey()) return "gemini";
  if (resolveOpenAiKey()) return "openai";
  if (resolveGeminiKey()) return "gemini";
  return null;
}

export function isAiEnabled(): boolean {
  return resolveLlmProvider() !== null;
}

function synthesisGeminiModelLadder(): string[] {
  const override = process.env.GEMINI_MODEL?.trim();
  if (override) return [override, SYNTHESIS_GEMINI_FALLBACK];
  return [SYNTHESIS_GEMINI_PRIMARY, SYNTHESIS_GEMINI_FALLBACK];
}

export function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b(429|503)\b/.test(msg) ||
    /quota|high demand|service unavailable|overloaded|try again later/i.test(
      msg,
    )
  );
}

export function friendlyLlmErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (isRetryableGeminiError(err)) {
    return "The AI service is busy. Wait a minute and try again.";
  }
  return msg.length > 320 ? `${msg.slice(0, 317)}…` : msg;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function modelForProvider(provider: LlmProvider): string {
  if (provider === "gemini") return synthesisGeminiModelLadder()[0]!;
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

async function completeGeminiJson(input: {
  system: string;
  user: string;
  model: string;
  temperature?: number;
}): Promise<string> {
  const genAI = getGemini()!;
  const geminiModel = genAI.getGenerativeModel({
    model: input.model,
    systemInstruction: input.system,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: input.temperature ?? 0.4,
    },
  });
  const result = await geminiModel.generateContent(input.user);
  const content = result.response.text()?.trim();
  if (!content) throw new Error("Empty response from Gemini");
  return content;
}

export async function completeJson(input: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<{ content: string; provider: LlmProvider; model: string }> {
  const provider = resolveLlmProvider();
  if (!provider) {
    throw new Error(
      "No LLM API key configured (set OPENAI_API_KEY or GEMINI_API_KEY)",
    );
  }

  if (provider === "gemini") {
    const models = input.model ? [input.model] : synthesisGeminiModelLadder();
    let lastError: unknown;
    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi]!;
      for (let attempt = 0; attempt < SYNTHESIS_RETRIES_PER_MODEL; attempt++) {
        try {
          const content = await completeGeminiJson({
            system: input.system,
            user: input.user,
            model,
            temperature: input.temperature,
          });
          return { content, provider, model };
        } catch (err) {
          lastError = err;
          if (
            isRetryableGeminiError(err) &&
            attempt < SYNTHESIS_RETRIES_PER_MODEL - 1
          ) {
            await sleep(SYNTHESIS_RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          if (isRetryableGeminiError(err) && mi < models.length - 1) break;
          throw err;
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Gemini request failed");
  }

  const model = input.model ?? modelForProvider(provider);
  const client = getOpenAI()!;
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: input.temperature ?? 0.4,
  });
  const content = res.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");
  return { content, provider, model };
}
