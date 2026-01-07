import Mustache from "mustache";
import type {
  DomainConfig,
  ExpertFacts,
  Scenario,
} from "@/domains/schema";

// Disable HTML escaping - we want raw content
Mustache.escape = (text: string) => text;

export interface TemplateContext {
  domain: DomainConfig;
  facts: Record<string, { name: string; content: string }>;
  scenario: Scenario;
  // Convenience: all facts as a flat list for iteration
  allFacts: Array<{ name: string; content: string }>;
}

/**
 * Build the context object for Mustache rendering
 */
export function buildTemplateContext(
  domain: DomainConfig,
  expertFacts: ExpertFacts,
  scenario: Scenario
): TemplateContext {
  // Convert facts array to a keyed object for easy access in templates
  const factsMap: Record<string, { name: string; content: string }> = {};
  for (const fact of expertFacts.facts) {
    factsMap[fact.name] = fact;
  }

  return {
    domain,
    facts: factsMap,
    scenario,
    allFacts: expertFacts.facts,
  };
}

/**
 * Render a Mustache template with the given context
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  return Mustache.render(template, context);
}

/**
 * Render a template with domain, facts, and scenario
 */
export function renderPrompt(
  template: string,
  domain: DomainConfig,
  expertFacts: ExpertFacts,
  scenario: Scenario
): string {
  const context = buildTemplateContext(domain, expertFacts, scenario);
  return renderTemplate(template, context);
}

/**
 * Parse a template to extract all variable references
 * Useful for the UI to show what variables are available
 */
export function parseTemplateVariables(template: string): string[] {
  const tokens = Mustache.parse(template);
  const variables: Set<string> = new Set();

  function extractVariables(tokens: Mustache.TemplateSpans) {
    for (const token of tokens) {
      // token[0] is the type: 'name', '#', '^', '>'
      // token[1] is the variable name
      if (token[0] === "name" || token[0] === "#" || token[0] === "^") {
        variables.add(token[1] as string);
      }
      // Nested tokens for sections
      if (token[0] === "#" || token[0] === "^") {
        if (token[4] && Array.isArray(token[4])) {
          extractVariables(token[4] as Mustache.TemplateSpans);
        }
      }
    }
  }

  extractVariables(tokens);
  return Array.from(variables);
}

/**
 * Validate that a template can be parsed
 */
export function validateTemplate(template: string): {
  valid: boolean;
  error?: string;
} {
  try {
    Mustache.parse(template);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

