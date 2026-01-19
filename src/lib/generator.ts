import { v4 as uuidv4 } from "uuid";
import type { DomainConfig, Scenario } from "@/domains/schema";
import { calculateTolerance } from "@/domains/types";
import {
  generateNarrativeDescription,
  generateFallbackDescriptionSync,
  type NarrativeGeneratorConfig,
} from "@/lib/narrative-generator";

export interface GeneratorOptions {
  /** Number of scenarios to generate */
  count: number;
  /** Min number of deltas to apply per scenario */
  minDeltas?: number;
  /** Max number of deltas to apply per scenario */
  maxDeltas?: number;
  /** Probability of including distractors (0-1) */
  distractorProbability?: number;
  /** Max distractors per scenario */
  maxDistractors?: number;
  /** Whether to generate twin pairs for sensitivity testing */
  generateTwins?: boolean;
  /** Random seed for reproducibility */
  seed?: number;
  /** Use LLM-based narrative generation (requires narrativeConfig) */
  useLlmNarrative?: boolean;
  /** Configuration for LLM narrative generation */
  narrativeConfig?: NarrativeGeneratorConfig;
  /** Model to use for narrative generation */
  narrativeModel?: string;
  /** Progress callback for async generation */
  onProgress?: (completed: number, total: number, phase: string) => void;
}

// Simple seeded random number generator (Mulberry32)
function createRng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calculate ground truth value based on anchor and deltas
 */
export function calculateGroundTruth(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[]
): { value: number; calculation: string } {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  let value = anchor.value;
  const steps: string[] = [`Base (${anchor.description}): ${anchor.value}%`];

  for (const deltaKey of appliedDeltaKeys) {
    const delta = domain.deltas[deltaKey];
    if (!delta) {
      throw new Error(`Unknown delta: ${deltaKey}`);
    }

    if (delta.type === "additive") {
      const sign = delta.value >= 0 ? "+" : "";
      steps.push(`${delta.description}: ${sign}${delta.value}%`);
      value += delta.value;
    } else if (delta.type === "multiplicative") {
      steps.push(`${delta.description}: x${delta.value}`);
      value *= delta.value;
    }
  }

  steps.push(`Final: ${value.toFixed(2)}%`);

  return {
    value: Math.round(value * 100) / 100, // Round to 2 decimal places
    calculation: steps.join("\n"),
  };
}

/**
 * Calculate tolerance for a scenario based on domain config
 * Uses the domain's tolerance configuration (fixed or percentage-based)
 */
function getToleranceForValue(domain: DomainConfig, value: number): number {
  return calculateTolerance(domain, value);
}

/**
 * Generate a simple structured description (fallback/preview mode)
 */
function generateSimpleDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): string {
  const anchor = domain.anchors[anchorKey];
  const parts: string[] = [];

  // Get entity label from domain config with default
  const entityLabel =
    "entityLabel" in domain ? (domain as any).entityLabel : "Subject";

  // Start with the entity type
  parts.push(`${entityLabel} Type: ${anchor.description}`);

  // Add each applied delta as a property characteristic
  const characteristics: string[] = [];
  for (const deltaKey of appliedDeltaKeys) {
    const delta = domain.deltas[deltaKey];
    if (delta) {
      characteristics.push(delta.description);
    }
  }

  if (characteristics.length > 0) {
    parts.push(`\nKey Characteristics:\n${characteristics.map((c) => `- ${c}`).join("\n")}`);
  }

  // Add distractors as additional context
  if (distractors.length > 0) {
    parts.push(`\nAdditional Context:\n${distractors.map((d) => `- ${d}`).join("\n")}`);
  }

  return parts.join("\n");
}

/**
 * Generate scenarios for a domain (synchronous - uses simple descriptions)
 */
export function generateScenarios(
  domain: DomainConfig,
  options: GeneratorOptions
): Scenario[] {
  const {
    count,
    minDeltas = 0,
    maxDeltas = 4,
    distractorProbability = 0.3,
    maxDistractors = 2,
    generateTwins = true,
    seed = Date.now(),
  } = options;

  const random = createRng(seed);
  const scenarios: Scenario[] = [];

  const anchorKeys = Object.keys(domain.anchors);
  const deltaKeys = Object.keys(domain.deltas);

  // Helper to pick random items
  const pickRandom = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => random() - 0.5);
    return shuffled.slice(0, count);
  };

  for (let i = 0; i < count; i++) {
    // Pick random anchor
    const anchorKey = anchorKeys[Math.floor(random() * anchorKeys.length)];

    // Pick random number of deltas
    const numDeltas =
      minDeltas + Math.floor(random() * (maxDeltas - minDeltas + 1));
    const appliedDeltaKeys = pickRandom(deltaKeys, numDeltas);

    // Maybe add distractors
    const distractors: string[] = [];
    if (random() < distractorProbability && domain.distractors.length > 0) {
      const numDistractors = 1 + Math.floor(random() * maxDistractors);
      distractors.push(...pickRandom(domain.distractors, numDistractors));
    }

    // Calculate ground truth
    const { value, calculation } = calculateGroundTruth(
      domain,
      anchorKey,
      appliedDeltaKeys
    );

    // Create scenario with simple description
    const scenarioId = uuidv4();
    const tolerance = getToleranceForValue(domain, value);
    const scenario: Scenario = {
      id: scenarioId,
      anchor: anchorKey,
      appliedDeltas: appliedDeltaKeys,
      distractors,
      contextDescription: generateSimpleDescription(
        domain,
        anchorKey,
        appliedDeltaKeys,
        distractors
      ),
      groundTruth: {
        value,
        tolerance, // Dynamic tolerance based on domain config
        calculation,
      },
    };

    scenarios.push(scenario);

    // Generate twin if enabled and we have deltas to swap
    if (generateTwins && appliedDeltaKeys.length > 0) {
      // Pick a delta to change
      const deltaToRemove =
        appliedDeltaKeys[Math.floor(random() * appliedDeltaKeys.length)];

      // Find a different delta to add (or just remove)
      const availableDeltas = deltaKeys.filter(
        (k) => !appliedDeltaKeys.includes(k)
      );

      let twinDeltaKeys: string[];
      let twinDeltaChanged: string;

      if (availableDeltas.length > 0 && random() > 0.5) {
        // Replace with a different delta
        const newDelta =
          availableDeltas[Math.floor(random() * availableDeltas.length)];
        twinDeltaKeys = appliedDeltaKeys
          .filter((k) => k !== deltaToRemove)
          .concat(newDelta);
        twinDeltaChanged = `${deltaToRemove} → ${newDelta}`;
      } else {
        // Just remove the delta
        twinDeltaKeys = appliedDeltaKeys.filter((k) => k !== deltaToRemove);
        twinDeltaChanged = `removed: ${deltaToRemove}`;
      }

      // Calculate twin ground truth
      const twinTruth = calculateGroundTruth(domain, anchorKey, twinDeltaKeys);
      const twinId = uuidv4();
      const twinTolerance = getToleranceForValue(domain, twinTruth.value);

      const twin: Scenario = {
        id: twinId,
        anchor: anchorKey,
        appliedDeltas: twinDeltaKeys,
        distractors, // Same distractors
        contextDescription: generateSimpleDescription(
          domain,
          anchorKey,
          twinDeltaKeys,
          distractors
        ),
        groundTruth: {
          value: twinTruth.value,
          tolerance: twinTolerance, // Dynamic tolerance based on domain config
          calculation: twinTruth.calculation,
        },
        twinId: scenarioId,
        twinDeltaChanged,
      };

      // Link the original to its twin
      scenario.twinId = twinId;
      scenario.twinDeltaChanged = twinDeltaChanged;

      scenarios.push(twin);
    }
  }

  return scenarios;
}

/**
 * Generate scenarios with LLM-based narrative descriptions (async)
 * This produces rich, natural language property prospectuses
 */
export async function generateScenariosWithNarrative(
  domain: DomainConfig,
  options: GeneratorOptions
): Promise<Scenario[]> {
  const {
    count,
    minDeltas = 0,
    maxDeltas = 4,
    distractorProbability = 0.3,
    maxDistractors = 2,
    generateTwins = true,
    seed = Date.now(),
    narrativeConfig,
    narrativeModel,
    onProgress,
  } = options;

  if (!narrativeConfig?.apiKey) {
    throw new Error("narrativeConfig with apiKey is required for LLM narrative generation");
  }

  const config: NarrativeGeneratorConfig = {
    ...narrativeConfig,
    model: narrativeModel || narrativeConfig.model,
  };

  const random = createRng(seed);
  const anchorKeys = Object.keys(domain.anchors);
  const deltaKeys = Object.keys(domain.deltas);

  // Helper to pick random items
  const pickRandom = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => random() - 0.5);
    return shuffled.slice(0, count);
  };

  // First, generate the scenario structure (fast)
  interface ScenarioSkeleton {
    id: string;
    anchorKey: string;
    appliedDeltaKeys: string[];
    distractors: string[];
    groundTruth: { value: number; tolerance: number; calculation: string };
    twinId?: string;
    twinDeltaChanged?: string;
    narrativeSeed: number;
  }

  const skeletons: ScenarioSkeleton[] = [];

  onProgress?.(0, count * 2, "Generating scenario structure...");

  for (let i = 0; i < count; i++) {
    // Pick random anchor
    const anchorKey = anchorKeys[Math.floor(random() * anchorKeys.length)];

    // Pick random number of deltas
    const numDeltas = minDeltas + Math.floor(random() * (maxDeltas - minDeltas + 1));
    const appliedDeltaKeys = pickRandom(deltaKeys, numDeltas);

    // Maybe add distractors
    const distractors: string[] = [];
    if (random() < distractorProbability && domain.distractors.length > 0) {
      const numDistractors = 1 + Math.floor(random() * maxDistractors);
      distractors.push(...pickRandom(domain.distractors, numDistractors));
    }

    // Calculate ground truth
    const { value, calculation } = calculateGroundTruth(domain, anchorKey, appliedDeltaKeys);
    const tolerance = getToleranceForValue(domain, value);

    const scenarioId = uuidv4();
    const skeleton: ScenarioSkeleton = {
      id: scenarioId,
      anchorKey,
      appliedDeltaKeys,
      distractors,
      groundTruth: { value, tolerance, calculation },
      narrativeSeed: Math.floor(random() * 1000000),
    };

    skeletons.push(skeleton);

    // Generate twin skeleton if enabled
    if (generateTwins && appliedDeltaKeys.length > 0) {
      const deltaToRemove = appliedDeltaKeys[Math.floor(random() * appliedDeltaKeys.length)];
      const availableDeltas = deltaKeys.filter((k) => !appliedDeltaKeys.includes(k));

      let twinDeltaKeys: string[];
      let twinDeltaChanged: string;

      if (availableDeltas.length > 0 && random() > 0.5) {
        const newDelta = availableDeltas[Math.floor(random() * availableDeltas.length)];
        twinDeltaKeys = appliedDeltaKeys.filter((k) => k !== deltaToRemove).concat(newDelta);
        twinDeltaChanged = `${deltaToRemove} → ${newDelta}`;
      } else {
        twinDeltaKeys = appliedDeltaKeys.filter((k) => k !== deltaToRemove);
        twinDeltaChanged = `removed: ${deltaToRemove}`;
      }

      const twinTruth = calculateGroundTruth(domain, anchorKey, twinDeltaKeys);
      const twinId = uuidv4();
      const twinTolerance = getToleranceForValue(domain, twinTruth.value);

      const twinSkeleton: ScenarioSkeleton = {
        id: twinId,
        anchorKey,
        appliedDeltaKeys: twinDeltaKeys,
        distractors,
        groundTruth: { value: twinTruth.value, tolerance: twinTolerance, calculation: twinTruth.calculation },
        twinId: scenarioId,
        twinDeltaChanged,
        narrativeSeed: Math.floor(random() * 1000000),
      };

      skeleton.twinId = twinId;
      skeleton.twinDeltaChanged = twinDeltaChanged;

      skeletons.push(twinSkeleton);
    }
  }

  // Now generate narratives for each skeleton in parallel batches (slow, LLM-based)
  const scenarios: Scenario[] = new Array(skeletons.length);
  const totalSkeletons = skeletons.length;
  const BATCH_SIZE = 5; // Process 5 narratives in parallel

  let completedCount = 0;

  for (let batchStart = 0; batchStart < skeletons.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, skeletons.length);
    const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);

    onProgress?.(completedCount, totalSkeletons, `Generating narratives ${batchStart + 1}-${batchEnd}/${totalSkeletons}...`);

    // Generate narratives for this batch in parallel
    const batchPromises = batchIndices.map(async (i) => {
      const skeleton = skeletons[i];
      let contextDescription: string;

      try {
        const narrative = await generateNarrativeDescription(
          domain,
          skeleton.anchorKey,
          skeleton.appliedDeltaKeys,
          skeleton.distractors,
          skeleton.narrativeSeed,
          config
        );
        contextDescription = narrative.description;
      } catch (error) {
        console.error(`Failed to generate narrative for scenario ${skeleton.id}:`, error);
        // Fallback to template-based description (using sync version)
        contextDescription = generateFallbackDescriptionSync(
          domain,
          skeleton.anchorKey,
          skeleton.appliedDeltaKeys,
          skeleton.distractors
        );
      }

      return {
        index: i,
        scenario: {
          id: skeleton.id,
          anchor: skeleton.anchorKey,
          appliedDeltas: skeleton.appliedDeltaKeys,
          distractors: skeleton.distractors,
          contextDescription,
          groundTruth: skeleton.groundTruth,
          twinId: skeleton.twinId,
          twinDeltaChanged: skeleton.twinDeltaChanged,
        } as Scenario,
      };
    });

    const batchResults = await Promise.all(batchPromises);

    // Store results in correct positions
    for (const { index, scenario } of batchResults) {
      scenarios[index] = scenario;
    }

    completedCount = batchEnd;

    // Small delay between batches to avoid rate limiting
    if (batchEnd < skeletons.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  onProgress?.(totalSkeletons, totalSkeletons, "Complete");

  return scenarios;
}

/**
 * Upgrade a single scenario's description to use LLM-based narrative
 */
export async function upgradeScenarioNarrative(
  domain: DomainConfig,
  scenario: Scenario,
  config: NarrativeGeneratorConfig,
  seed?: number
): Promise<Scenario> {
  const narrativeSeed = seed ?? Date.now();

  try {
    const narrative = await generateNarrativeDescription(
      domain,
      scenario.anchor,
      scenario.appliedDeltas,
      scenario.distractors,
      narrativeSeed,
      config
    );

    return {
      ...scenario,
      contextDescription: narrative.description,
    };
  } catch (error) {
    console.error(`Failed to upgrade narrative for scenario ${scenario.id}:`, error);
    return scenario; // Return unchanged on error
  }
}

// Re-export getTwinPairs from scenario-utils for backward compatibility
export { getTwinPairs } from "./scenario-utils";
