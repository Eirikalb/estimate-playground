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

// Scenario Result Schema
// After running a scenario through an LLM

export const ScenarioResultSchema = z.object({
  scenarioId: z.string(),
  prediction: z.number(),
  reasoning: z.string(),
  latencyMs: z.number(),

  // Metrics
  error: z.number(), // prediction - groundTruth
  absoluteError: z.number(),
  withinTolerance: z.boolean(),
});

export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

// Benchmark Run Schema
// A complete run with multiple scenarios

export const BenchmarkRunSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  domainId: z.string(),
  model: z.string(),
  promptStrategy: z.string(),
  promptTemplate: z.string(), // The actual template used

  scenarios: z.array(ScenarioSchema),
  results: z.array(ScenarioResultSchema),

  // Aggregate metrics
  aggregateMetrics: z.object({
    hitRate: z.number(), // % within tolerance
    meanError: z.number(),
    rmse: z.number(),
    directionalAccuracy: z.number().optional(), // For twin tests
    avgLatencyMs: z.number(),
    totalCost: z.number().optional(),
  }),
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

