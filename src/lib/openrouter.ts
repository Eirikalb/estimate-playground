import { z } from "zod";
import { PredictionSchema, type Prediction } from "@/domains/schema";

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMResult {
  prediction: Prediction;
  rawResponse: string;
  latencyMs: number;
  tokensUsed?: number;
  model: string;
}

// Popular models available on OpenRouter
export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "openai/gpt-5-2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "openai/gpt-5-2-mini", name: "GPT-5.2 Mini", provider: "OpenAI" },
  {id: "anthropic/claude-sonnet-4.5", name: "Claude 4.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", provider: "Google" },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash Preview", provider: "Google" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro Preview", provider: "Google" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", provider: "Google" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", provider: "Google" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", provider: "Meta" },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral" },
  { id: "mistralai/mistral-medium", name: "Mistral Medium", provider: "Mistral" },
] as const;

/**
 * Call OpenRouter API with a prompt
 */
export async function callOpenRouter(
  prompt: string,
  config: OpenRouterConfig
): Promise<LLMResult> {
  const startTime = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "https://estimate-playground.local",
      "X-Title": "Estimate Playground",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  const latencyMs = Date.now() - startTime;

  const rawContent = data.choices[0]?.message?.content ?? "";

  // Parse the JSON response from the LLM
  const prediction = parseJsonResponse(rawContent);

  return {
    prediction,
    rawResponse: rawContent,
    latencyMs,
    tokensUsed: data.usage?.total_tokens,
    model: config.model,
  };
}

/**
 * Parse JSON from LLM response, handling various formats
 */
function parseJsonResponse(content: string): Prediction {
  // Try to extract JSON from the response
  // LLMs sometimes wrap JSON in markdown code blocks
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the response
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Validate with Zod schema
    const result = PredictionSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    // If schema validation fails but we have the required fields, try to coerce
    if (typeof parsed.yield === "number" || typeof parsed.yield === "string") {
      return {
        yield: typeof parsed.yield === "string" ? parseFloat(parsed.yield) : parsed.yield,
        reasoning: parsed.reasoning ?? parsed.explanation ?? "No reasoning provided",
      };
    }

    throw new Error(`Invalid prediction format: ${result.error.message}`);
  } catch (e) {
    // If JSON parsing fails, try to extract a number from the response
    const yieldMatch = content.match(/(\d+\.?\d*)\s*%/);
    if (yieldMatch) {
      return {
        yield: parseFloat(yieldMatch[1]),
        reasoning: content,
      };
    }

    throw new Error(
      `Failed to parse LLM response as JSON: ${e instanceof Error ? e.message : "Unknown error"}`
    );
  }
}

/**
 * Run multiple rollouts of the same prompt for variance estimation
 * Runs in parallel for efficiency
 */
export async function callOpenRouterMultiple(
  prompt: string,
  config: OpenRouterConfig,
  numRollouts: number
): Promise<LLMResult[]> {
  if (numRollouts <= 0) {
    return [];
  }

  if (numRollouts === 1) {
    const result = await callOpenRouter(prompt, config);
    return [result];
  }

  // Run rollouts in parallel (with some batching to avoid rate limits)
  const batchSize = 5;
  const results: LLMResult[] = [];

  for (let i = 0; i < numRollouts; i += batchSize) {
    const batchCount = Math.min(batchSize, numRollouts - i);
    const batchPromises = Array(batchCount)
      .fill(null)
      .map(async () => {
        try {
          return await callOpenRouter(prompt, config);
        } catch (error) {
          return {
            prediction: {
              yield: 0,
              reasoning: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
            rawResponse: "",
            latencyMs: 0,
            model: config.model,
          } as LLMResult;
        }
      });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < numRollouts) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}

/**
 * Run a batch of prompts through OpenRouter
 */
export async function runBatch(
  prompts: string[],
  config: OpenRouterConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<LLMResult[]> {
  const results: LLMResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    try {
      const result = await callOpenRouter(prompts[i], config);
      results.push(result);
    } catch (error) {
      // Create an error result
      results.push({
        prediction: { yield: 0, reasoning: `Error: ${error instanceof Error ? error.message : "Unknown error"}` },
        rawResponse: "",
        latencyMs: 0,
        model: config.model,
      });
    }

    onProgress?.(i + 1, prompts.length);

    // Small delay between requests to avoid rate limiting
    if (i < prompts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Simple text generation without JSON parsing - for narrative generation
 */
export async function generateText(
  prompt: string,
  config: OpenRouterConfig
): Promise<{ text: string; latencyMs: number }> {
  const startTime = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "https://estimate-playground.local",
      "X-Title": "Estimate Playground",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    text: data.choices[0]?.message?.content ?? "",
    latencyMs,
  };
}

