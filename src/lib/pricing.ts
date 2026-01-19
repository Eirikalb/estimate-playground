/**
 * Model pricing data for cost calculation
 * Prices are per 1 million tokens (as reported by OpenRouter)
 * Updated: January 2026
 */

export interface ModelPricing {
  promptTokenCost: number; // Cost per 1M prompt tokens in USD
  completionTokenCost: number; // Cost per 1M completion tokens in USD
}

/**
 * Pricing data for models available on OpenRouter
 * Source: https://openrouter.ai/models
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  "openai/gpt-4o": {
    promptTokenCost: 2.5,
    completionTokenCost: 10,
  },
  "openai/gpt-4o-mini": {
    promptTokenCost: 0.15,
    completionTokenCost: 0.6,
  },
  "openai/gpt-4-turbo": {
    promptTokenCost: 10,
    completionTokenCost: 30,
  },
  "openai/gpt-5.2": {
    promptTokenCost: 3,
    completionTokenCost: 12,
  },
  "openai/gpt-5.1": {
    promptTokenCost: 2.5,
    completionTokenCost: 10,
  },

  // Anthropic Models
  "anthropic/claude-opus-4.5": {
    promptTokenCost: 15,
    completionTokenCost: 75,
  },
  "anthropic/claude-sonnet-4.5": {
    promptTokenCost: 3,
    completionTokenCost: 15,
  },
  "anthropic/claude-sonnet-4": {
    promptTokenCost: 3,
    completionTokenCost: 15,
  },
  "anthropic/claude-3.5-sonnet": {
    promptTokenCost: 3,
    completionTokenCost: 15,
  },
  "anthropic/claude-3-haiku": {
    promptTokenCost: 0.25,
    completionTokenCost: 1.25,
  },

  // Google Models
  "google/gemini-pro-1.5": {
    promptTokenCost: 1.25,
    completionTokenCost: 5,
  },
  "google/gemini-flash-1.5": {
    promptTokenCost: 0.075,
    completionTokenCost: 0.3,
  },
  "google/gemini-2.5-flash-preview": {
    promptTokenCost: 0.15,
    completionTokenCost: 0.6,
  },
  "google/gemini-2.5-pro-preview": {
    promptTokenCost: 1.25,
    completionTokenCost: 5,
  },
  "google/gemini-3-flash-preview": {
    promptTokenCost: 0.1,
    completionTokenCost: 0.4,
  },
  "google/gemini-3-pro-preview": {
    promptTokenCost: 1,
    completionTokenCost: 4,
  },

  // Meta Models
  "meta-llama/llama-3.1-70b-instruct": {
    promptTokenCost: 0.52,
    completionTokenCost: 0.75,
  },
  "meta-llama/llama-3.1-8b-instruct": {
    promptTokenCost: 0.055,
    completionTokenCost: 0.055,
  },

  // Mistral Models
  "mistralai/mistral-large": {
    promptTokenCost: 2,
    completionTokenCost: 6,
  },
  "mistralai/mistral-medium": {
    promptTokenCost: 2.7,
    completionTokenCost: 8.1,
  },
};

/**
 * Default pricing for unknown models (conservative estimate)
 */
const DEFAULT_PRICING: ModelPricing = {
  promptTokenCost: 1,
  completionTokenCost: 3,
};

/**
 * Get pricing for a model
 */
export function getModelPricing(modelId: string): ModelPricing {
  return MODEL_PRICING[modelId] || DEFAULT_PRICING;
}

/**
 * Calculate cost for a single API call
 * @param modelId - The model ID (e.g., "openai/gpt-4o")
 * @param promptTokens - Number of prompt tokens used
 * @param completionTokens - Number of completion tokens used
 * @returns Cost in USD
 */
export function calculateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getModelPricing(modelId);

  // Convert from per-1M-token pricing
  const promptCost = (promptTokens / 1_000_000) * pricing.promptTokenCost;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionTokenCost;

  return promptCost + completionCost;
}

/**
 * Format cost for display
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.0012")
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "$0.0000";
  if (cost < 0.0001) return "<$0.0001";
  return `$${cost.toFixed(4)}`;
}

/**
 * Format cost in a more compact way for tables
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.12" or "0.12¢")
 */
export function formatCostCompact(cost: number): string {
  if (cost === 0) return "—";
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}
