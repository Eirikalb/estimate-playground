import { z } from "zod";

// Domain Configuration Schema
// Defines the "physics" of a domain - the hidden rules for ground truth calculation

export const DeltaSchema = z.object({
  type: z.enum(["additive", "multiplicative"]),
  value: z.number(),
  description: z.string(),
});

export const AnchorSchema = z.object({
  value: z.number(),
  description: z.string(),
});

export const DomainConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  outputUnit: z.string(), // e.g., "%", "hours", "x multiple"

  // Hidden rules for ground truth calculation
  anchors: z.record(z.string(), AnchorSchema),
  deltas: z.record(z.string(), DeltaSchema),
  distractors: z.array(z.string()),
});

export type DomainConfig = z.infer<typeof DomainConfigSchema>;
export type Delta = z.infer<typeof DeltaSchema>;
export type Anchor = z.infer<typeof AnchorSchema>;

// Expert Facts Schema
// Freeform knowledge chunks that can be injected into prompts

export const ExpertFactSchema = z.object({
  name: z.string(), // Identifier for Mustache: {{#facts.benchmarks}}
  content: z.string(), // Freeform text, markdown, tables, etc.
});

export const ExpertFactsSchema = z.object({
  domainId: z.string(),
  facts: z.array(ExpertFactSchema),
});

export type ExpertFact = z.infer<typeof ExpertFactSchema>;
export type ExpertFacts = z.infer<typeof ExpertFactsSchema>;

// Scenario Schema
// A generated test case with ground truth

export const GroundTruthSchema = z.object({
  value: z.number(),
  tolerance: z.number(), // Acceptable range +/-
  calculation: z.string(), // How we arrived at the number
});

export const ScenarioSchema = z.object({
  id: z.string(),
  anchor: z.string(), // Which base rate applies
  appliedDeltas: z.array(z.string()), // Which adjustments are active
  distractors: z.array(z.string()), // Irrelevant info injected
  contextDescription: z.string(), // Natural language for LLM

  groundTruth: GroundTruthSchema,

  twinId: z.string().optional(), // Linked twin for sensitivity testing
  twinDeltaChanged: z.string().optional(), // Which delta differs from twin
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type GroundTruth = z.infer<typeof GroundTruthSchema>;

// Prediction Schema
// What the LLM returns

export const PredictionSchema = z.object({
  yield: z.number(),
  reasoning: z.string(),
});

export type Prediction = z.infer<typeof PredictionSchema>;

// Individual Rollout Result
// A single prediction from one LLM call

export const RolloutResultSchema = z.object({
  prediction: z.number(),
  reasoning: z.string(),
  latencyMs: z.number(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export type RolloutResult = z.infer<typeof RolloutResultSchema>;

// Scenario Result Schema
// After running a scenario through an LLM (supports multiple rollouts)

export const ScenarioResultSchema = z.object({
  scenarioId: z.string(),
  
  // Timing and status
  status: z.enum(["pending", "running", "completed", "failed"]).default("pending"),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  
  // Multiple rollouts for variance estimation
  rollouts: z.array(RolloutResultSchema),
  
  // Aggregate stats across rollouts
  meanPrediction: z.number(),
  stdDeviation: z.number(),
  minPrediction: z.number(),
  maxPrediction: z.number(),

  // Evaluation against ground truth (using mean)
  error: z.number(), // meanPrediction - groundTruth
  absoluteError: z.number(),
  withinTolerance: z.boolean(),
  
  // Consistency metrics
  rolloutConsistency: z.number(), // % of rollouts within tolerance
});

export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

// Benchmark Run Schema
// A complete run with multiple scenarios

export const BenchmarkRunSchema = z.object({
  id: z.string(),
  timestamp: z.string(), // When the run was created (legacy, kept for compatibility)
  domainId: z.string(),
  model: z.string(),
  promptStrategy: z.string(),
  promptTemplate: z.string(), // The actual template used
  rolloutsPerScenario: z.number().default(1), // Number of rollouts per scenario

  // Run status and timing
  status: z.enum(["generating_narratives", "running", "completed", "failed"]).default("running"),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),

  // Narrative generation tracking
  useNarrativeDescriptions: z.boolean().optional(),
  narrativeModel: z.string().optional(),
  narrativesGenerated: z.number().optional(), // Count of narratives generated so far
  narrativesTotal: z.number().optional(), // Total narratives to generate

  // Test set reference (if run was created from a test set)
  testSetName: z.string().optional(),
  testSetVersion: z.string().optional(),

  scenarios: z.array(ScenarioSchema),
  results: z.array(ScenarioResultSchema),

  // Aggregate metrics (populated when run completes)
  aggregateMetrics: z.object({
    hitRate: z.number(), // % within tolerance
    meanError: z.number(),
    rmse: z.number(),
    directionalAccuracy: z.number().optional(), // For twin tests
    avgLatencyMs: z.number(),
    totalCost: z.number().optional(),
    // Variance metrics (when rollouts > 1)
    avgStdDeviation: z.number().optional(), // Average std deviation across scenarios
    avgConsistency: z.number().optional(), // Average rollout consistency
  }).optional(), // Optional while run is in progress
});

export type BenchmarkRun = z.infer<typeof BenchmarkRunSchema>;

// Prompt Template Schema
export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  template: z.string(), // Mustache template
});

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

// Test Set Schema
// A versioned collection of scenarios for reproducible testing
export const TestSetSchema = z.object({
  name: z.string(), // Unique identifier (e.g., "baseline-v1")
  version: z.string(), // Semantic version (e.g., "1.0.0")
  description: z.string(), // What this test set covers
  created: z.string(), // ISO timestamp
  domainId: z.string(),
  scenarioCount: z.number(),
  seed: z.number().optional(), // Seed used to generate (for reference)
  generateTwins: z.boolean(),
  useNarrativeDescriptions: z.boolean(),
  narrativeModel: z.string().optional(),
  sourceRunId: z.string().optional(), // If created from an existing run
  scenarios: z.array(ScenarioSchema),
  changelog: z.array(z.string()).optional(), // Version history
});

export type TestSet = z.infer<typeof TestSetSchema>;

