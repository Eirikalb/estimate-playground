import type {
  Scenario,
  ScenarioResult,
  BenchmarkRun,
  RolloutResult,
  DomainConfig,
  DifficultyScore,
  ErrorPattern,
} from "@/domains/schema";
import type { LLMResult } from "./openrouter";
import { getTwinPairs } from "./generator";
import { calculateCost } from "./pricing";

/**
 * Calculate standard deviation
 */
function calculateStdDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Evaluate multiple rollouts against ground truth
 * Calculates mean, std deviation, and consistency metrics
 */
export function evaluateMultipleRollouts(
  scenario: Scenario,
  results: LLMResult[],
  modelId?: string
): ScenarioResult {
  const groundTruth = scenario.groundTruth.value;
  const tolerance = scenario.groundTruth.tolerance;

  // Convert LLMResults to RolloutResults, preserving token usage and calculating cost
  const rollouts: RolloutResult[] = results.map((r) => {
    const rollout: RolloutResult = {
      prediction: r.prediction.yield,
      reasoning: r.prediction.reasoning,
      latencyMs: r.latencyMs,
    };

    // Add token usage if available
    if (r.promptTokens !== undefined) {
      rollout.promptTokens = r.promptTokens;
    }
    if (r.completionTokens !== undefined) {
      rollout.completionTokens = r.completionTokens;
    }
    if (r.tokensUsed !== undefined) {
      rollout.totalTokens = r.tokensUsed;
    }

    // Calculate cost if we have token data and model ID
    if (r.promptTokens !== undefined && r.completionTokens !== undefined) {
      const model = modelId || r.model;
      rollout.cost = calculateCost(model, r.promptTokens, r.completionTokens);
    }

    return rollout;
  });

  // Calculate aggregate stats
  const predictions = rollouts.map((r) => r.prediction);
  const meanPrediction = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
  const stdDeviation = calculateStdDeviation(predictions);
  const minPrediction = Math.min(...predictions);
  const maxPrediction = Math.max(...predictions);

  // Evaluate against ground truth using mean
  const error = meanPrediction - groundTruth;
  const absoluteError = Math.abs(error);
  const withinTolerance = absoluteError <= tolerance;

  // Calculate rollout consistency (% of rollouts within tolerance)
  const rolloutsWithinTolerance = predictions.filter(
    (p) => Math.abs(p - groundTruth) <= tolerance
  ).length;
  const rolloutConsistency = (rolloutsWithinTolerance / predictions.length) * 100;

  // Build result first without confidence
  const result: ScenarioResult = {
    scenarioId: scenario.id,
    status: "completed" as const,
    rollouts,
    meanPrediction: Math.round(meanPrediction * 1000) / 1000,
    stdDeviation: Math.round(stdDeviation * 1000) / 1000,
    minPrediction: Math.round(minPrediction * 1000) / 1000,
    maxPrediction: Math.round(maxPrediction * 1000) / 1000,
    error: Math.round(error * 1000) / 1000,
    absoluteError: Math.round(absoluteError * 1000) / 1000,
    withinTolerance,
    rolloutConsistency: Math.round(rolloutConsistency * 100) / 100,
  };

  // Calculate confidence score only for multi-rollout scenarios
  if (results.length > 1) {
    result.confidence = calculateConfidenceScore(scenario, result);
  }

  return result;
}

/**
 * Evaluate a single prediction against ground truth (backwards compatible)
 */
export function evaluatePrediction(
  scenario: Scenario,
  result: LLMResult,
  modelId?: string
): ScenarioResult {
  return evaluateMultipleRollouts(scenario, [result], modelId || result.model);
}

/**
 * Calculate aggregate metrics for a benchmark run
 */
export function calculateAggregateMetrics(
  scenarios: Scenario[],
  results: ScenarioResult[]
): BenchmarkRun["aggregateMetrics"] {
  if (results.length === 0) {
    return {
      hitRate: 0,
      meanError: 0,
      rmse: 0,
      avgLatencyMs: 0,
    };
  }

  // Hit rate: percentage within tolerance
  const hits = results.filter((r) => r.withinTolerance).length;
  const hitRate = (hits / results.length) * 100;

  // Mean error (can be positive or negative, shows bias)
  const meanError =
    results.reduce((sum, r) => sum + r.error, 0) / results.length;

  // RMSE: Root Mean Square Error
  const mse =
    results.reduce((sum, r) => sum + r.error * r.error, 0) / results.length;
  const rmse = Math.sqrt(mse);

  // Average latency across all rollouts
  const totalLatency = results.reduce(
    (sum, r) => sum + r.rollouts.reduce((s, roll) => s + roll.latencyMs, 0),
    0
  );
  const totalRollouts = results.reduce((sum, r) => sum + r.rollouts.length, 0);
  const avgLatencyMs = totalRollouts > 0 ? totalLatency / totalRollouts : 0;

  // Directional accuracy for twin pairs
  const directionalAccuracy = calculateDirectionalAccuracy(scenarios, results);

  // Variance metrics (when rollouts > 1)
  const hasMultipleRollouts = results.some((r) => r.rollouts.length > 1);
  let avgStdDeviation: number | undefined;
  let avgConsistency: number | undefined;

  if (hasMultipleRollouts) {
    avgStdDeviation =
      results.reduce((sum, r) => sum + r.stdDeviation, 0) / results.length;
    avgConsistency =
      results.reduce((sum, r) => sum + r.rolloutConsistency, 0) / results.length;
  }

  // Calculate confidence metrics
  const confidenceData = calculateAverageConfidence(scenarios, results);

  // Aggregate token usage and costs across all rollouts
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let hasTokenData = false;

  for (const result of results) {
    for (const rollout of result.rollouts) {
      if (rollout.promptTokens !== undefined) {
        totalPromptTokens += rollout.promptTokens;
        hasTokenData = true;
      }
      if (rollout.completionTokens !== undefined) {
        totalCompletionTokens += rollout.completionTokens;
      }
      if (rollout.totalTokens !== undefined) {
        totalTokens += rollout.totalTokens;
      }
      if (rollout.cost !== undefined) {
        totalCost += rollout.cost;
      }
    }
  }

  return {
    hitRate: Math.round(hitRate * 100) / 100,
    meanError: Math.round(meanError * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    avgLatencyMs: Math.round(avgLatencyMs),
    ...(directionalAccuracy !== undefined && { directionalAccuracy }),
    ...(avgStdDeviation !== undefined && {
      avgStdDeviation: Math.round(avgStdDeviation * 1000) / 1000,
    }),
    ...(avgConsistency !== undefined && {
      avgConsistency: Math.round(avgConsistency * 100) / 100,
    }),
    avgConfidence: confidenceData.avgScore,
    confidenceDistribution: confidenceData.distribution,
    // Token and cost metrics (only include if we have data)
    ...(hasTokenData && {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
    }),
  };
}

/**
 * Calculate directional accuracy for twin pairs
 * 
 * For each twin pair, check if the model correctly identified which
 * scenario should have a higher/lower yield based on the delta change.
 */
function calculateDirectionalAccuracy(
  scenarios: Scenario[],
  results: ScenarioResult[]
): number | undefined {
  const twinPairs = getTwinPairs(scenarios);

  if (twinPairs.length === 0) {
    return undefined;
  }

  let correct = 0;
  let total = 0;

  for (const { original, twin } of twinPairs) {
    const originalResult = results.find((r) => r.scenarioId === original.id);
    const twinResult = results.find((r) => r.scenarioId === twin.id);

    if (!originalResult || !twinResult) {
      continue;
    }

    total++;

    // Determine expected direction based on ground truth
    const expectedDiff =
      original.groundTruth.value - twin.groundTruth.value;
    const actualDiff = originalResult.meanPrediction - twinResult.meanPrediction;

    // Check if the direction matches (both positive, both negative, or both zero)
    if (
      (expectedDiff > 0 && actualDiff > 0) ||
      (expectedDiff < 0 && actualDiff < 0) ||
      (Math.abs(expectedDiff) < 0.01 && Math.abs(actualDiff) < 0.1)
    ) {
      correct++;
    }
  }

  if (total === 0) {
    return undefined;
  }

  return Math.round((correct / total) * 100 * 100) / 100;
}

/**
 * Analyze distractor immunity
 * 
 * Compare scenarios with and without distractors to see if
 * distractors inappropriately influence predictions.
 */
export function analyzeDistractorImmunity(
  scenarios: Scenario[],
  results: ScenarioResult[]
): {
  withDistractors: { count: number; avgError: number; hitRate: number };
  withoutDistractors: { count: number; avgError: number; hitRate: number };
  difference: number;
} {
  const withDistractors = scenarios
    .filter((s) => s.distractors.length > 0)
    .map((s) => results.find((r) => r.scenarioId === s.id))
    .filter((r): r is ScenarioResult => r !== undefined);

  const withoutDistractors = scenarios
    .filter((s) => s.distractors.length === 0)
    .map((s) => results.find((r) => r.scenarioId === s.id))
    .filter((r): r is ScenarioResult => r !== undefined);

  const calcStats = (results: ScenarioResult[]) => {
    if (results.length === 0) {
      return { count: 0, avgError: 0, hitRate: 0 };
    }
    return {
      count: results.length,
      avgError:
        results.reduce((sum, r) => sum + r.absoluteError, 0) / results.length,
      hitRate:
        (results.filter((r) => r.withinTolerance).length / results.length) *
        100,
    };
  };

  const statsWith = calcStats(withDistractors);
  const statsWithout = calcStats(withoutDistractors);

  return {
    withDistractors: statsWith,
    withoutDistractors: statsWithout,
    difference: statsWith.avgError - statsWithout.avgError,
  };
}

/**
 * Calculate confidence score for a scenario result
 *
 * Confidence is derived from three factors:
 * 1. Prediction variance (std deviation) - lower = more confident
 * 2. Distance from tolerance bounds - further inside = more confident
 * 3. Rollout consensus - higher agreement = more confident
 *
 * Returns a score from 0-100 and a qualitative level
 */
export function calculateConfidenceScore(
  scenario: Scenario,
  result: ScenarioResult
): {
  score: number;
  level: "high" | "medium" | "low";
  factors: {
    varianceFactor: number; // 0-100, how consistent predictions are
    marginFactor: number; // 0-100, how far from tolerance boundary
    consensusFactor: number; // 0-100, % of rollouts agreeing
  };
} {
  const groundTruth = scenario.groundTruth.value;
  const tolerance = scenario.groundTruth.tolerance;

  // Factor 1: Variance (std deviation) - normalized against tolerance
  // If stdDev is 0, perfect consistency (100). If stdDev > tolerance, low confidence
  const stdDev = result.stdDeviation;
  const varianceFactor = Math.max(0, Math.min(100,
    100 * (1 - (stdDev / tolerance))
  ));

  // Factor 2: Distance from tolerance boundary
  // If prediction is exactly at ground truth, marginFactor = 100
  // If at tolerance boundary, marginFactor = 0
  // If outside tolerance, marginFactor = 0 (or negative but clamped)
  const distanceFromTruth = Math.abs(result.meanPrediction - groundTruth);
  const marginFactor = Math.max(0, Math.min(100,
    100 * (1 - (distanceFromTruth / tolerance))
  ));

  // Factor 3: Rollout consensus (what % of rollouts agree with the mean's verdict)
  // If only 1 rollout, consensus is 100%
  const consensusFactor = result.rollouts.length > 1
    ? result.rolloutConsistency
    : 100;

  // Weighted combination:
  // - Variance: 35% weight (consistency matters a lot for confidence)
  // - Margin: 35% weight (how safely within/outside tolerance)
  // - Consensus: 30% weight (agreement among rollouts)
  const score = Math.round(
    varianceFactor * 0.35 +
    marginFactor * 0.35 +
    consensusFactor * 0.30
  );

  // Determine qualitative level (thresholds match UI color coding)
  let level: "high" | "medium" | "low";
  if (score >= 80) {
    level = "high";
  } else if (score >= 60) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score,
    level,
    factors: {
      varianceFactor: Math.round(varianceFactor),
      marginFactor: Math.round(marginFactor),
      consensusFactor: Math.round(consensusFactor),
    },
  };
}

/**
 * Calculate average confidence score across all results
 * Uses pre-computed confidence if available, otherwise calculates on the fly
 */
export function calculateAverageConfidence(
  scenarios: Scenario[],
  results: ScenarioResult[]
): { avgScore: number; distribution: { high: number; medium: number; low: number } } {
  if (results.length === 0) {
    return { avgScore: 0, distribution: { high: 0, medium: 0, low: 0 } };
  }

  let totalScore = 0;
  const distribution = { high: 0, medium: 0, low: 0 };
  let count = 0;

  for (const result of results) {
    // Use pre-computed confidence if available (multi-rollout scenarios)
    if (result.confidence) {
      totalScore += result.confidence.score;
      distribution[result.confidence.level]++;
      count++;
    } else {
      // Calculate on the fly for single-rollout or legacy results
      const scenario = scenarios.find(s => s.id === result.scenarioId);
      if (!scenario) continue;

      const confidence = calculateConfidenceScore(scenario, result);
      totalScore += confidence.score;
      distribution[confidence.level]++;
      count++;
    }
  }

  return {
    avgScore: count > 0 ? Math.round(totalScore / count) : 0,
    distribution,
  };
}

/**
 * Get detailed breakdown of results
 */
export function getDetailedBreakdown(
  scenarios: Scenario[],
  results: ScenarioResult[]
): Array<{
  scenario: Scenario;
  result: ScenarioResult;
  analysis: {
    errorCategory: "excellent" | "good" | "fair" | "poor";
    biasDirection: "overestimate" | "underestimate" | "accurate";
    consistencyCategory?: "high" | "medium" | "low";
  };
}> {
  return scenarios
    .map((scenario) => {
      const result = results.find((r) => r.scenarioId === scenario.id);
      if (!result) return null;

      const absError = result.absoluteError;
      const error = result.error;

      let errorCategory: "excellent" | "good" | "fair" | "poor";
      if (absError <= 0.15) {
        errorCategory = "excellent";
      } else if (absError <= 0.35) {
        errorCategory = "good";
      } else if (absError <= 0.75) {
        errorCategory = "fair";
      } else {
        errorCategory = "poor";
      }

      let biasDirection: "overestimate" | "underestimate" | "accurate";
      if (error > 0.1) {
        biasDirection = "overestimate";
      } else if (error < -0.1) {
        biasDirection = "underestimate";
      } else {
        biasDirection = "accurate";
      }

      // Consistency category (when multiple rollouts)
      let consistencyCategory: "high" | "medium" | "low" | undefined;
      if (result.rollouts.length > 1) {
        if (result.stdDeviation <= 0.1) {
          consistencyCategory = "high";
        } else if (result.stdDeviation <= 0.25) {
          consistencyCategory = "medium";
        } else {
          consistencyCategory = "low";
        }
      }

      return {
        scenario,
        result,
        analysis: {
          errorCategory,
          biasDirection,
          ...(consistencyCategory && { consistencyCategory }),
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Calculate difficulty score for a scenario
 *
 * Difficulty is based on:
 * - Number of deltas (more = harder)
 * - Types of deltas (multiplicative are harder than additive)
 * - Number of distractors (more noise = harder)
 * - Interaction effects (multiple multiplicative deltas compound)
 */
export function calculateScenarioDifficulty(
  scenario: Scenario,
  domainConfig?: DomainConfig
): DifficultyScore {
  const deltaCount = scenario.appliedDeltas.length;
  const distractorCount = scenario.distractors.length;

  // Delta complexity: 0-50 points
  // Base: 12 points per delta, max 50
  const deltaBaseScore = Math.min(50, deltaCount * 12);

  // Check for multiplicative deltas if domain config is available
  let multiplicativeCount = 0;
  if (domainConfig) {
    multiplicativeCount = scenario.appliedDeltas.filter(
      (deltaId) => domainConfig.deltas[deltaId]?.type === "multiplicative"
    ).length;
  }

  // Multiplicative bonus: +5 per multiplicative delta
  const multiplicativeBonus = multiplicativeCount * 5;
  const deltaComplexity = Math.min(50, deltaBaseScore + multiplicativeBonus);

  // Distractor load: 0-30 points
  // 10 points per distractor, max 30
  const distractorLoad = Math.min(30, distractorCount * 10);

  // Interaction effects: 0-20 points
  // Multiple deltas create interaction complexity
  // Especially when mixing positive and negative adjustments
  let interactionEffects = 0;
  if (deltaCount >= 2) {
    interactionEffects = Math.min(20, (deltaCount - 1) * 5);
  }
  if (multiplicativeCount >= 2) {
    interactionEffects = Math.min(20, interactionEffects + 10);
  }

  // Total score: 0-100
  const score = Math.min(100, deltaComplexity + distractorLoad + interactionEffects);

  // Determine level
  let level: DifficultyScore["level"];
  if (score < 15) {
    level = "trivial";
  } else if (score < 30) {
    level = "easy";
  } else if (score < 50) {
    level = "moderate";
  } else if (score < 70) {
    level = "hard";
  } else {
    level = "expert";
  }

  return {
    score: Math.round(score),
    level,
    factors: {
      deltaComplexity: Math.round(deltaComplexity),
      distractorLoad: Math.round(distractorLoad),
      interactionEffects: Math.round(interactionEffects),
    },
  };
}

/**
 * Detect error pattern for a scenario result
 *
 * Analyzes the prediction error to categorize the type of mistake
 */
export function detectErrorPattern(
  scenario: Scenario,
  result: ScenarioResult,
  domainConfig?: DomainConfig
): ErrorPattern {
  const { error, absoluteError, withinTolerance } = result;
  const groundTruth = scenario.groundTruth.value;
  const tolerance = scenario.groundTruth.tolerance;

  // If within tolerance, it's accurate
  if (withinTolerance) {
    return {
      pattern: "accurate",
      severity: "minor",
      details: "Prediction within acceptable tolerance",
    };
  }

  // Determine severity based on error magnitude
  let severity: ErrorPattern["severity"];
  if (absoluteError <= tolerance * 2) {
    severity = "minor";
  } else if (absoluteError <= tolerance * 4) {
    severity = "moderate";
  } else {
    severity = "severe";
  }

  // Check for anchor bias
  // If prediction is very close to a common anchor value
  if (domainConfig) {
    const anchorValue = domainConfig.anchors[scenario.anchor]?.value;
    if (anchorValue !== undefined) {
      const distanceFromAnchor = Math.abs(result.meanPrediction - anchorValue);
      const distanceFromTruth = Math.abs(result.meanPrediction - groundTruth);

      // If prediction is closer to anchor than to truth, and truth differs from anchor
      if (distanceFromAnchor < distanceFromTruth * 0.5 &&
          Math.abs(groundTruth - anchorValue) > tolerance) {
        return {
          pattern: "anchor_bias",
          severity,
          details: `Prediction (${result.meanPrediction.toFixed(2)}) is closer to anchor value (${anchorValue.toFixed(2)}) than ground truth (${groundTruth.toFixed(2)})`,
        };
      }
    }
  }

  // Check for delta blindness
  // If deltas should have moved the value but prediction ignored them
  if (scenario.appliedDeltas.length > 0 && domainConfig) {
    const anchorValue = domainConfig.anchors[scenario.anchor]?.value ?? groundTruth;
    const expectedDelta = groundTruth - anchorValue;
    const actualDelta = result.meanPrediction - anchorValue;

    // If prediction barely moved from anchor despite significant deltas
    if (Math.abs(expectedDelta) > 0.3 && Math.abs(actualDelta) < Math.abs(expectedDelta) * 0.3) {
      return {
        pattern: "delta_blindness",
        severity,
        details: `Prediction failed to account for ${scenario.appliedDeltas.length} delta(s). Expected adjustment of ${expectedDelta.toFixed(2)}, got ${actualDelta.toFixed(2)}`,
      };
    }
  }

  // Check for distractor influence
  // This is harder to detect definitively, but we can flag scenarios with distractors that have large errors
  if (scenario.distractors.length > 0 && severity === "severe") {
    return {
      pattern: "distractor_influence",
      severity,
      details: `Large error in scenario with ${scenario.distractors.length} distractor(s) - possible distractor influence`,
    };
  }

  // Check for magnitude error (right direction, wrong magnitude)
  if (domainConfig) {
    const anchorValue = domainConfig.anchors[scenario.anchor]?.value ?? groundTruth;
    const expectedDirection = groundTruth > anchorValue ? 1 : groundTruth < anchorValue ? -1 : 0;
    const actualDirection = result.meanPrediction > anchorValue ? 1 : result.meanPrediction < anchorValue ? -1 : 0;

    if (expectedDirection !== 0 && expectedDirection === actualDirection) {
      return {
        pattern: "magnitude_error",
        severity,
        details: `Correct direction from anchor, but magnitude off by ${absoluteError.toFixed(2)}`,
      };
    }
  }

  // Default to systematic over/underestimate
  if (error > 0) {
    return {
      pattern: "systematic_overestimate",
      severity,
      details: `Overestimated by ${error.toFixed(2)} (${((error / groundTruth) * 100).toFixed(1)}%)`,
    };
  } else {
    return {
      pattern: "systematic_underestimate",
      severity,
      details: `Underestimated by ${Math.abs(error).toFixed(2)} (${((Math.abs(error) / groundTruth) * 100).toFixed(1)}%)`,
    };
  }
}

/**
 * Error pattern summary type
 */
export interface ErrorPatternSummary {
  systematicBias?: "overestimate" | "underestimate" | "neutral";
  biasStrength?: number;
  anchorBiasRate?: number;
  deltaBlindnessRate?: number;
  distractorInfluenceRate?: number;
  errorByDifficulty?: {
    trivial?: number;
    easy?: number;
    moderate?: number;
    hard?: number;
    expert?: number;
  };
}

/**
 * Analyze error patterns across all results in a run
 */
export function analyzeErrorPatterns(
  scenarios: Scenario[],
  results: ScenarioResult[],
  domainConfig?: DomainConfig
): ErrorPatternSummary {
  const completedResults = results.filter((r) => r.status === "completed");

  if (completedResults.length === 0) {
    return {
      systematicBias: "neutral",
      biasStrength: 0,
    };
  }

  // Calculate systematic bias
  const totalError = completedResults.reduce((sum, r) => sum + r.error, 0);
  const avgError = totalError / completedResults.length;
  const avgAbsError = completedResults.reduce((sum, r) => sum + r.absoluteError, 0) / completedResults.length;

  let systematicBias: "overestimate" | "underestimate" | "neutral";
  if (avgError > 0.15) {
    systematicBias = "overestimate";
  } else if (avgError < -0.15) {
    systematicBias = "underestimate";
  } else {
    systematicBias = "neutral";
  }

  // Bias strength: how much of the error is systematic vs random
  // If all errors are in the same direction, bias strength is high
  const biasStrength = avgAbsError > 0
    ? Math.round(Math.min(100, (Math.abs(avgError) / avgAbsError) * 100))
    : 0;

  // Count specific error patterns
  let anchorBiasCount = 0;
  let deltaBlindnessCount = 0;
  let distractorInfluenceCount = 0;

  for (const result of completedResults) {
    const scenario = scenarios.find((s) => s.id === result.scenarioId);
    if (!scenario) continue;

    const pattern = detectErrorPattern(scenario, result, domainConfig);
    if (pattern.pattern === "anchor_bias") anchorBiasCount++;
    if (pattern.pattern === "delta_blindness") deltaBlindnessCount++;
    if (pattern.pattern === "distractor_influence") distractorInfluenceCount++;
  }

  const total = completedResults.length;

  // Calculate error rates by difficulty level
  const errorByDifficulty: Record<string, number[]> = {
    trivial: [],
    easy: [],
    moderate: [],
    hard: [],
    expert: [],
  };

  for (const result of completedResults) {
    const scenario = scenarios.find((s) => s.id === result.scenarioId);
    if (!scenario) continue;

    const difficulty = calculateScenarioDifficulty(scenario, domainConfig);
    errorByDifficulty[difficulty.level].push(result.absoluteError);
  }

  const avgErrorByDifficulty: Record<string, number | undefined> = {};
  for (const [level, errors] of Object.entries(errorByDifficulty)) {
    if (errors.length > 0) {
      avgErrorByDifficulty[level] = Math.round(
        (errors.reduce((sum, e) => sum + e, 0) / errors.length) * 1000
      ) / 1000;
    }
  }

  return {
    systematicBias,
    biasStrength,
    anchorBiasRate: Math.round((anchorBiasCount / total) * 100),
    deltaBlindnessRate: Math.round((deltaBlindnessCount / total) * 100),
    distractorInfluenceRate: Math.round((distractorInfluenceCount / total) * 100),
    errorByDifficulty: avgErrorByDifficulty as {
      trivial?: number;
      easy?: number;
      moderate?: number;
      hard?: number;
      expert?: number;
    },
  };
}

/**
 * Calculate average difficulty and distribution for scenarios
 */
export function calculateDifficultyMetrics(
  scenarios: Scenario[],
  domainConfig?: DomainConfig
): { avgDifficulty: number; distribution: Record<DifficultyScore["level"], number> } {
  if (scenarios.length === 0) {
    return {
      avgDifficulty: 0,
      distribution: { trivial: 0, easy: 0, moderate: 0, hard: 0, expert: 0 },
    };
  }

  let totalScore = 0;
  const distribution: Record<DifficultyScore["level"], number> = {
    trivial: 0,
    easy: 0,
    moderate: 0,
    hard: 0,
    expert: 0,
  };

  for (const scenario of scenarios) {
    const difficulty = calculateScenarioDifficulty(scenario, domainConfig);
    totalScore += difficulty.score;
    distribution[difficulty.level]++;
  }

  return {
    avgDifficulty: Math.round(totalScore / scenarios.length),
    distribution,
  };
}

