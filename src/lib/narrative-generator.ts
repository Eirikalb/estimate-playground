/**
 * LLM-Based Narrative Description Generator
 *
 * Uses an LLM to generate rich, natural language descriptions that embed
 * the key factors (anchor + deltas) within realistic domain-specific narratives.
 *
 * This module delegates to domain plugins for domain-specific narrative generation.
 */

import type { DomainConfig } from "@/domains/schema";
import type { NarrativePromptContext } from "@/domains/types";
import { generateText, type OpenRouterConfig } from "@/lib/openrouter";
import { getDomain, ensureDomainsInitialized } from "@/domains";

/**
 * Get domain plugin (server-side only helper)
 */
async function getDomainPlugin(id: string) {
  await ensureDomainsInitialized();
  return getDomain(id);
}

// Default model for narrative generation (fast and cheap)
const DEFAULT_NARRATIVE_MODEL = "openai/gpt-4o-mini";

export interface NarrativeGeneratorConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface GeneratedNarrative {
  description: string;
  briefSummary: string;
  latencyMs: number;
}

/**
 * Build a narrative prompt using the domain plugin
 */
async function buildNarrativePrompt(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): Promise<string> {
  // Try to get domain plugin for domain-specific prompt
  const plugin = await getDomainPlugin(domain.id);

  if (plugin) {
    const context: NarrativePromptContext = {
      anchorKey,
      appliedDeltaKeys,
      distractors,
      seed,
    };
    return plugin.buildNarrativePrompt(context);
  }

  // Fallback: generate a generic prompt
  return buildGenericPrompt(domain, anchorKey, appliedDeltaKeys, distractors, seed);
}

/**
 * Build a generic narrative prompt when no domain plugin is available
 */
function buildGenericPrompt(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  // Get UI labels from domain config with defaults
  const entityLabel =
    "entityLabel" in domain ? (domain as any).entityLabel : "Subject";
  const outputLabel =
    "outputLabel" in domain ? (domain as any).outputLabel : "Estimate";

  // Get delta descriptions
  const deltaDetails = appliedDeltaKeys
    .map((key) => {
      const delta = domain.deltas[key];
      return delta
        ? {
            key,
            description: delta.description,
            impact:
              delta.value > 0
                ? `increases ${outputLabel.toLowerCase()}`
                : `decreases ${outputLabel.toLowerCase()}`,
          }
        : null;
    })
    .filter(Boolean);

  // Build context
  const context = `
${entityLabel} type: ${anchor.description}
Domain: ${domain.name}
`.trim();

  // Build the key factors section
  let keyFactorsSection = "";
  if (deltaDetails.length > 0) {
    keyFactorsSection = `
KEY FACTORS TO EMBED (these MUST be clearly mentioned as they affect the ${outputLabel.toLowerCase()}):
${deltaDetails.map((d, i) => `${i + 1}. ${d!.description}`).join("\n")}
`.trim();
  }

  // Build distractors section
  let distractorsSection = "";
  if (distractors.length > 0) {
    distractorsSection = `
ADDITIONAL DETAILS TO INCLUDE (supplementary details, include them naturally):
${distractors.map((d) => `- ${d}`).join("\n")}
`.trim();
  }

  return `You are an expert analyst writing a detailed description for evaluation.

CONTEXT:
${context}

${keyFactorsSection}

${distractorsSection}

INSTRUCTIONS:
1. Generate a detailed, realistic description of this ${entityLabel.toLowerCase()}
2. Include all KEY FACTORS naturally in the narrative
3. Make the description professional and authentic
4. Generate between 300-500 words
5. Do NOT include any ${outputLabel.toLowerCase()} estimates or predictions

Use random seed ${seed} for variation.

Generate the description now:`;
}

/**
 * Generate a rich narrative description using an LLM
 */
export async function generateNarrativeDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number,
  config: NarrativeGeneratorConfig
): Promise<GeneratedNarrative> {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const prompt = await buildNarrativePrompt(
    domain,
    anchorKey,
    appliedDeltaKeys,
    distractors,
    seed
  );

  const openRouterConfig: OpenRouterConfig = {
    apiKey: config.apiKey,
    model: config.model || DEFAULT_NARRATIVE_MODEL,
    temperature: config.temperature ?? 0.8,
    maxTokens: 2048,
  };

  const result = await generateText(prompt, openRouterConfig);

  // Generate a brief summary for quick reference
  const briefSummary = await generateBriefSummary(
    domain,
    anchorKey,
    appliedDeltaKeys
  );

  return {
    description: result.text.trim(),
    briefSummary,
    latencyMs: result.latencyMs,
  };
}

/**
 * Generate a brief summary suitable for quick reference (non-LLM, deterministic)
 */
export async function generateBriefSummary(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[]
): Promise<string> {
  // Try domain plugin first
  const plugin = await getDomainPlugin(domain.id);
  if (plugin) {
    return plugin.generateBriefSummary(anchorKey, appliedDeltaKeys);
  }

  // Fallback
  const anchor = domain.anchors[anchorKey];
  if (!anchor) return "";

  const deltaDescriptions = appliedDeltaKeys
    .map((key) => domain.deltas[key]?.description)
    .filter(Boolean);

  let summary = `${anchor.description}`;

  if (deltaDescriptions.length > 0) {
    summary += ` with ${deltaDescriptions.join(", ").toLowerCase()}`;
  }

  return summary;
}

/**
 * Fallback template-based description (for when LLM is not available)
 */
export async function generateFallbackDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): Promise<string> {
  // Try domain plugin first
  const plugin = await getDomainPlugin(domain.id);
  if (plugin) {
    return plugin.generateFallbackDescription(
      anchorKey,
      appliedDeltaKeys,
      distractors
    );
  }

  // Fallback to generic
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  // Get UI labels from domain config with defaults
  const entityLabel =
    "entityLabel" in domain ? (domain as any).entityLabel : "Subject";
  const scenarioLabel =
    "scenarioLabel" in domain
      ? (domain as any).scenarioLabel
      : "Scenario Details";

  const parts: string[] = [];

  parts.push(`## ${scenarioLabel}\n`);
  parts.push(`*Overview*\n`);
  parts.push(`${entityLabel} Type: ${anchor.description}\n`);

  // Add each applied delta as a characteristic
  if (appliedDeltaKeys.length > 0) {
    const characteristics = appliedDeltaKeys
      .map((key) => domain.deltas[key]?.description)
      .filter(Boolean);

    parts.push(`\n**Key Factors:**`);
    for (const char of characteristics) {
      parts.push(`- ${char}`);
    }
  }

  // Add distractors as additional context
  if (distractors.length > 0) {
    parts.push(`\n**Additional Context:**`);
    for (const d of distractors) {
      parts.push(`- ${d}`);
    }
  }

  return parts.join("\n");
}

/**
 * Synchronous version of generateFallbackDescription for backward compatibility
 * Uses a simple fallback without plugin lookup
 */
export function generateFallbackDescriptionSync(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  // Get UI labels from domain config with defaults
  const entityLabel =
    "entityLabel" in domain ? (domain as any).entityLabel : "Subject";
  const scenarioLabel =
    "scenarioLabel" in domain
      ? (domain as any).scenarioLabel
      : "Scenario Details";

  const parts: string[] = [];

  parts.push(`## ${scenarioLabel}\n`);
  parts.push(`*Overview*\n`);
  parts.push(`${entityLabel} Type: ${anchor.description}\n`);

  // Add each applied delta as a characteristic
  if (appliedDeltaKeys.length > 0) {
    const characteristics = appliedDeltaKeys
      .map((key) => domain.deltas[key]?.description)
      .filter(Boolean);

    parts.push(`\n**Key Factors:**`);
    for (const char of characteristics) {
      parts.push(`- ${char}`);
    }
  }

  // Add distractors as additional context
  if (distractors.length > 0) {
    parts.push(`\n**Additional Context:**`);
    for (const d of distractors) {
      parts.push(`- ${d}`);
    }
  }

  return parts.join("\n");
}

/**
 * Batch generate narratives for multiple scenarios (parallel processing)
 */
export async function generateNarrativesBatch(
  domain: DomainConfig,
  scenarios: Array<{
    anchorKey: string;
    appliedDeltaKeys: string[];
    distractors: string[];
    seed: number;
  }>,
  config: NarrativeGeneratorConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedNarrative[]> {
  const results: GeneratedNarrative[] = new Array(scenarios.length);
  const BATCH_SIZE = 5; // Process 5 narratives in parallel
  let completedCount = 0;

  for (
    let batchStart = 0;
    batchStart < scenarios.length;
    batchStart += BATCH_SIZE
  ) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, scenarios.length);
    const batchIndices = Array.from(
      { length: batchEnd - batchStart },
      (_, i) => batchStart + i
    );

    // Generate narratives for this batch in parallel
    const batchPromises = batchIndices.map(async (i) => {
      const scenario = scenarios[i];

      try {
        const narrative = await generateNarrativeDescription(
          domain,
          scenario.anchorKey,
          scenario.appliedDeltaKeys,
          scenario.distractors,
          scenario.seed,
          config
        );
        return { index: i, narrative };
      } catch (error) {
        // Fallback to template-based generation on error
        console.error(`Failed to generate narrative for scenario ${i}:`, error);
        const fallbackDesc = await generateFallbackDescription(
          domain,
          scenario.anchorKey,
          scenario.appliedDeltaKeys,
          scenario.distractors
        );
        const briefSum = await generateBriefSummary(
          domain,
          scenario.anchorKey,
          scenario.appliedDeltaKeys
        );
        return {
          index: i,
          narrative: {
            description: fallbackDesc,
            briefSummary: briefSum,
            latencyMs: 0,
          },
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Store results in correct positions
    for (const { index, narrative } of batchResults) {
      results[index] = narrative;
    }

    completedCount = batchEnd;
    onProgress?.(completedCount, scenarios.length);

    // Small delay between batches to avoid rate limiting
    if (batchEnd < scenarios.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
