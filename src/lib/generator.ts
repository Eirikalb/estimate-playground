import { v4 as uuidv4 } from "uuid";
import type { DomainConfig, Scenario } from "@/domains/schema";

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
 * Generate a natural language description of a scenario
 */
function generateContextDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): string {
  const anchor = domain.anchors[anchorKey];
  const parts: string[] = [];

  // Start with the property type/location
  parts.push(`Property Type: ${anchor.description}`);

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
 * Generate scenarios for a domain
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

    // Create scenario
    const scenarioId = uuidv4();
    const scenario: Scenario = {
      id: scenarioId,
      anchor: anchorKey,
      appliedDeltas: appliedDeltaKeys,
      distractors,
      contextDescription: generateContextDescription(
        domain,
        anchorKey,
        appliedDeltaKeys,
        distractors
      ),
      groundTruth: {
        value,
        tolerance: 0.35, // +/- 0.35% is acceptable
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

      const twin: Scenario = {
        id: twinId,
        anchor: anchorKey,
        appliedDeltas: twinDeltaKeys,
        distractors, // Same distractors
        contextDescription: generateContextDescription(
          domain,
          anchorKey,
          twinDeltaKeys,
          distractors
        ),
        groundTruth: {
          value: twinTruth.value,
          tolerance: 0.35,
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
 * Get twin pairs from a list of scenarios
 */
export function getTwinPairs(
  scenarios: Scenario[]
): Array<{ original: Scenario; twin: Scenario }> {
  const pairs: Array<{ original: Scenario; twin: Scenario }> = [];
  const seen = new Set<string>();

  for (const scenario of scenarios) {
    if (scenario.twinId && !seen.has(scenario.id) && !seen.has(scenario.twinId)) {
      const twin = scenarios.find((s) => s.id === scenario.twinId);
      if (twin) {
        pairs.push({ original: scenario, twin });
        seen.add(scenario.id);
        seen.add(scenario.twinId);
      }
    }
  }

  return pairs;
}

