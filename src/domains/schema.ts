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

// Tolerance mode for ground truth evaluation
export const ToleranceModeSchema = z.enum(["fixed", "percentage"]);

export const DomainConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  outputUnit: z.string(), // e.g., "%", "hours", "x multiple"

  // UI Labels (with defaults for backward compatibility)
  outputLabel: z.string().default("Estimate"), // e.g., "Yield", "Growth Rate"
  entityLabel: z.string().default("Subject"), // e.g., "Property", "Company"
  scenarioLabel: z.string().default("Scenario Details"), // e.g., "Property Details", "Company Profile"

  // Tolerance configuration
  toleranceMode: ToleranceModeSchema.default("fixed"), // "fixed" = absolute, "percentage" = relative
  toleranceValue: z.number().default(0.35), // Fixed: ±0.35, Percentage: ±10%

  // Hidden rules for ground truth calculation
  anchors: z.record(z.string(), AnchorSchema),
  deltas: z.record(z.string(), DeltaSchema),
  distractors: z.array(z.string()),
});

export type DomainConfig = z.infer<typeof DomainConfigSchema>;
export type Delta = z.infer<typeof DeltaSchema>;
export type Anchor = z.infer<typeof AnchorSchema>;
export type ToleranceMode = z.infer<typeof ToleranceModeSchema>;

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
  // Token usage and cost tracking
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  cost: z.number().optional(), // Cost in USD
});

export type RolloutResult = z.infer<typeof RolloutResultSchema>;

// Difficulty Score Schema
// Measures how challenging a scenario is based on its composition
export const DifficultyScoreSchema = z.object({
  score: z.number(), // 0-100, higher = more difficult
  level: z.enum(["trivial", "easy", "moderate", "hard", "expert"]),
  factors: z.object({
    deltaComplexity: z.number(), // 0-100, based on number and type of deltas
    distractorLoad: z.number(), // 0-100, distractors add cognitive noise
    interactionEffects: z.number(), // 0-100, multiplicative deltas compound
  }),
});

export type DifficultyScore = z.infer<typeof DifficultyScoreSchema>;

// Error Pattern Schema
// Categorizes the type of error made by the model
export const ErrorPatternSchema = z.object({
  pattern: z.enum([
    "accurate", // Within tolerance
    "systematic_overestimate", // Consistently too high
    "systematic_underestimate", // Consistently too low
    "anchor_bias", // Prediction too close to anchor value
    "delta_blindness", // Failed to account for deltas
    "distractor_influence", // Distractors inappropriately affected prediction
    "magnitude_error", // Right direction, wrong magnitude
  ]),
  severity: z.enum(["minor", "moderate", "severe"]),
  details: z.string().optional(), // Explanation of the detected pattern
});

export type ErrorPattern = z.infer<typeof ErrorPatternSchema>;

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

  // Difficulty and error pattern analysis
  difficulty: DifficultyScoreSchema.optional(),
  errorPattern: ErrorPatternSchema.optional(),
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
    // Token usage and cost aggregation
    totalPromptTokens: z.number().optional(),
    totalCompletionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    totalCost: z.number().optional(), // Total cost in USD
    // Variance metrics (when rollouts > 1)
    avgStdDeviation: z.number().optional(), // Average std deviation across scenarios
    avgConsistency: z.number().optional(), // Average rollout consistency
    // Difficulty metrics
    avgDifficulty: z.number().optional(), // Average difficulty score (0-100)
    difficultyDistribution: z.object({
      trivial: z.number(),
      easy: z.number(),
      moderate: z.number(),
      hard: z.number(),
      expert: z.number(),
    }).optional(),
    // Error pattern analysis
    errorPatternSummary: z.object({
      systematicBias: z.enum(["overestimate", "underestimate", "neutral"]).optional(),
      biasStrength: z.number().optional(), // 0-100, how strong the bias is
      anchorBiasRate: z.number().optional(), // % of scenarios with anchor bias
      deltaBlindnessRate: z.number().optional(), // % of scenarios with delta blindness
      distractorInfluenceRate: z.number().optional(), // % affected by distractors
      errorByDifficulty: z.object({
        trivial: z.number().optional(),
        easy: z.number().optional(),
        moderate: z.number().optional(),
        hard: z.number().optional(),
        expert: z.number().optional(),
      }).optional(),
    }).optional(),
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

