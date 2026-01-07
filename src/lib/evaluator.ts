import type {
  Scenario,
  ScenarioResult,
  BenchmarkRun,
  RolloutResult,
} from "@/domains/schema";
import type { LLMResult } from "./openrouter";
import { getTwinPairs } from "./generator";

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
  results: LLMResult[]
): ScenarioResult {
  const groundTruth = scenario.groundTruth.value;
  const tolerance = scenario.groundTruth.tolerance;

  // Convert LLMResults to RolloutResults
  const rollouts: RolloutResult[] = results.map((r) => ({
    prediction: r.prediction.yield,
    reasoning: r.prediction.reasoning,
    latencyMs: r.latencyMs,
  }));

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

  return {
    scenarioId: scenario.id,
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
}

/**
 * Evaluate a single prediction against ground truth (backwards compatible)
 */
export function evaluatePrediction(
  scenario: Scenario,
  result: LLMResult
): ScenarioResult {
  return evaluateMultipleRollouts(scenario, [result]);
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

