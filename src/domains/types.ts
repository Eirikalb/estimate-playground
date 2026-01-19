/**
 * Domain Plugin Type System
 *
 * Defines the interfaces for domain plugins that enable multi-domain support
 * in the estimation playground.
 */

import type { DomainConfig, ExpertFacts, PromptTemplate, ScenarioMetrics } from "./schema";

/**
 * Few-shot example for domain-specific prompts
 */
export interface DomainExample {
  /** Description of the scenario (property/company/etc) */
  description: string;
  /** Analysis walkthrough */
  analysis: string;
  /** The result with reasoning and estimate */
  result: {
    reasoning: string;
    estimate: number;
  };
}

/**
 * Configuration for narrative generation specific to a domain
 */
export interface NarrativePromptContext {
  /** The anchor key (e.g., "office_oslo_cbd", "saas_startup_growth") */
  anchorKey: string;
  /** Applied delta keys */
  appliedDeltaKeys: string[];
  /** Distractor strings to include */
  distractors: string[];
  /** Random seed for reproducible generation */
  seed: number;
  /** Explicit metrics for constrained narrative generation (optional) */
  metrics?: ScenarioMetrics;
}

/**
 * Domain Plugin Interface
 *
 * Each domain implements this interface to provide all domain-specific
 * functionality including configuration, facts, narrative generation,
 * and prompt templates.
 */
export interface DomainPlugin {
  /** Domain configuration (anchors, deltas, distractors, UI labels) */
  config: DomainConfig;

  /** Expert facts for prompt injection */
  facts: ExpertFacts;

  /**
   * Build the LLM prompt for generating narrative descriptions.
   * This creates domain-specific narratives (property prospectus, investment memo, etc.)
   */
  buildNarrativePrompt: (context: NarrativePromptContext) => string;

  /**
   * Generate a fallback description when LLM narrative generation fails or is disabled.
   * Returns a structured, deterministic description.
   */
  generateFallbackDescription: (
    anchorKey: string,
    appliedDeltaKeys: string[],
    distractors: string[]
  ) => string;

  /**
   * Generate a brief summary for quick reference (non-LLM, deterministic)
   */
  generateBriefSummary: (
    anchorKey: string,
    appliedDeltaKeys: string[]
  ) => string;

  /**
   * Get few-shot examples for this domain.
   * Used in few-shot prompt templates.
   */
  getExamples: () => DomainExample[];

  /**
   * Get domain-specific prompt templates.
   * These override or supplement the generic templates.
   */
  getPromptTemplates: () => PromptTemplate[];
}

/**
 * Domain metadata for listing and selection
 */
export interface DomainInfo {
  id: string;
  name: string;
  description: string;
  outputUnit: string;
  outputLabel: string;
  entityLabel: string;
}

/**
 * Tolerance configuration modes
 */
export type ToleranceMode = "fixed" | "percentage";

/**
 * Extended domain configuration with UI labels and tolerance settings
 */
export interface ExtendedDomainConfig extends DomainConfig {
  /** Label for the output value (e.g., "Yield", "Growth Rate") */
  outputLabel: string;

  /** Label for the entity being evaluated (e.g., "Property", "Company") */
  entityLabel: string;

  /** Label for the scenario section (e.g., "Property Details", "Company Profile") */
  scenarioLabel: string;

  /** How tolerance is calculated: "fixed" (absolute) or "percentage" (relative) */
  toleranceMode: ToleranceMode;

  /** Tolerance value: absolute value for "fixed", percentage for "percentage" */
  toleranceValue: number;
}

/**
 * Helper to check if a config has extended fields
 */
export function isExtendedConfig(
  config: DomainConfig
): config is ExtendedDomainConfig {
  return "outputLabel" in config && "toleranceMode" in config;
}

/**
 * Get tolerance for a ground truth value based on domain config
 */
export function calculateTolerance(
  config: DomainConfig | ExtendedDomainConfig,
  groundTruthValue: number
): number {
  if (isExtendedConfig(config)) {
    if (config.toleranceMode === "percentage") {
      return Math.abs(groundTruthValue) * (config.toleranceValue / 100);
    }
    return config.toleranceValue;
  }
  // Default for legacy configs
  return 0.35;
}

/**
 * Get display labels with defaults for legacy configs
 */
export function getDomainLabels(config: DomainConfig | ExtendedDomainConfig): {
  outputLabel: string;
  entityLabel: string;
  scenarioLabel: string;
} {
  if (isExtendedConfig(config)) {
    return {
      outputLabel: config.outputLabel,
      entityLabel: config.entityLabel,
      scenarioLabel: config.scenarioLabel,
    };
  }
  // Defaults for legacy configs
  return {
    outputLabel: "Estimate",
    entityLabel: "Subject",
    scenarioLabel: "Scenario Details",
  };
}
