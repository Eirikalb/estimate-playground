/**
 * Financial Domain Plugin
 *
 * Company Revenue Growth Rate Estimation
 */

import type { DomainPlugin, DomainExample, NarrativePromptContext } from "../types";
import type { DomainConfig, ExpertFacts, PromptTemplate } from "../schema";
import {
  buildNarrativePrompt as buildPrompt,
  generateFallbackDescription as fallbackDescription,
  generateBriefSummary as briefSummary,
} from "./narrative";

// Import config and facts
import configData from "./config.json";
import factsData from "./facts.json";
import examplesData from "./examples.json";

// Cast to proper types
const config = configData as DomainConfig;
const facts = factsData as ExpertFacts;
const examples = examplesData as { domainId: string; examples: DomainExample[] };

/**
 * Get few-shot examples for this domain
 */
function getExamples(): DomainExample[] {
  return examples.examples;
}

/**
 * Get domain-specific prompt templates
 * For now, we return an empty array as templates are loaded from files
 * In the future, this could return programmatically generated templates
 */
function getPromptTemplates(): PromptTemplate[] {
  // Templates are loaded from the prompts/ folder by the prompt engine
  // This function is here for domains that want to provide templates programmatically
  return [];
}

/**
 * Financial Domain Plugin
 */
export const financialPlugin: DomainPlugin = {
  config,
  facts,

  buildNarrativePrompt: (context: NarrativePromptContext) => {
    return buildPrompt(config, context);
  },

  generateFallbackDescription: (
    anchorKey: string,
    appliedDeltaKeys: string[],
    distractors: string[]
  ) => {
    return fallbackDescription(config, anchorKey, appliedDeltaKeys, distractors);
  },

  generateBriefSummary: (anchorKey: string, appliedDeltaKeys: string[]) => {
    return briefSummary(config, anchorKey, appliedDeltaKeys);
  },

  getExamples,
  getPromptTemplates,
};

// Default export for convenience
export default financialPlugin;
