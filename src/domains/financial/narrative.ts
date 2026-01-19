/**
 * Financial Domain - Narrative Generation
 *
 * Generates rich, natural language investment memos for company
 * growth estimation scenarios.
 */

import type { DomainConfig } from "../schema";
import type { NarrativePromptContext } from "../types";
import {
  getCompanyCategory,
  getCompanyNamesForAnchor,
  getProfileForAnchor,
  companyLocations,
  founderBackgrounds,
  investorNames,
  teamSizeRanges,
  fundingRanges,
} from "./profiles";

/**
 * Build the LLM prompt for generating an investment memo narrative
 */
export function buildNarrativePrompt(
  config: DomainConfig,
  context: NarrativePromptContext
): string {
  const { anchorKey, appliedDeltaKeys, distractors, seed } = context;

  const anchor = config.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const category = getCompanyCategory(anchorKey);
  const profile = getProfileForAnchor(anchorKey);
  const companyNameOptions = getCompanyNamesForAnchor(anchorKey);

  // Get delta descriptions
  const deltaDetails = appliedDeltaKeys
    .map((key) => {
      const delta = config.deltas[key];
      return delta
        ? {
            key,
            description: delta.description,
            impact: delta.value > 0 ? "increases growth" : "decreases growth",
          }
        : null;
    })
    .filter(Boolean);

  // Build company context
  const companyContext = `
Company type: ${anchor.description}
Industry: ${category.charAt(0).toUpperCase() + category.slice(1)}
Possible stages: ${profile?.stages.join(", ") || "Growth stage"}
Typical characteristics: ${profile?.characteristics.join(", ") || "Established market position"}
Typical metrics: ${profile?.metrics.join(", ") || "Stable revenue"}
Company name options: ${companyNameOptions.slice(0, 5).join(", ")}
Location options: ${companyLocations.slice(0, 5).join(", ")}
Founder background options: ${founderBackgrounds.slice(0, 3).join("; ")}
Investor options: ${investorNames.slice(0, 5).join(", ")}
`.trim();

  // Build the key factors section
  let keyFactorsSection = "";
  if (deltaDetails.length > 0) {
    keyFactorsSection = `
KEY FACTORS TO EMBED (these MUST be clearly mentioned in the memo as they affect the company's growth rate):
${deltaDetails.map((d, i) => `${i + 1}. ${d!.description}`).join("\n")}
`.trim();
  }

  // Build distractors section
  let distractorsSection = "";
  if (distractors.length > 0) {
    distractorsSection = `
ADDITIONAL DETAILS TO INCLUDE (these are supplementary details, include them naturally):
${distractors.map((d) => `- ${d}`).join("\n")}
`.trim();
  }

  const prompt = `You are an equity research analyst writing an investment memo for a private company seeking funding or being evaluated for a growth assessment.

Generate a detailed, realistic company profile following the exact style and format shown in the example below. The description should read like a professional investment memo from a venture capital or private equity firm.

COMPANY CONTEXT:
${companyContext}

${keyFactorsSection}

${distractorsSection}

EXAMPLE FORMAT (follow this style closely):

"""
## Company Overview

**Nexus Platform** is a B2B SaaS company headquartered in San Francisco, founded in 2019 by former Salesforce product leaders. The company provides an AI-powered customer success platform that helps enterprises reduce churn and drive expansion revenue.

### Business Model & Metrics

The company operates a subscription-based model with land-and-expand dynamics. Current ARR is approximately $28M, with 127 enterprise customers including 15 Fortune 500 accounts. The average contract value (ACV) is $220K for enterprise deals, with a 12-month sales cycle for net-new logos. The company reports Net Revenue Retention (NRR) of 118%, driven by strong upsell motion and usage-based pricing tiers.

### Team & Funding

The leadership team includes CEO Sarah Chen (ex-Salesforce VP Product), CTO Marcus Williams (ex-Google engineering lead), and CRO David Park (ex-Zoom VP Sales). Total headcount is 142 employees across engineering (55%), sales & marketing (30%), and G&A (15%). The company has raised $65M to date across Seed, Series A, and Series B rounds, with Series B led by Index Ventures at a $280M post-money valuation in Q1 2024.

### Market Position & Competition

Nexus competes in the $8B customer success software market, projected to grow 18% annually. Primary competitors include Gainsight, Totango, and ChurnZero. The company differentiates through AI-native architecture and deep integrations with product analytics platforms.

### Recent Developments

- Launched enterprise API platform in Q3, enabling deeper product integrations
- Expanded European presence with London office (now 12% of revenue)
- Recently hired VP of Engineering from Datadog to lead platform modernization
- Successfully implemented 8% price increase for existing customers with minimal churn impact
"""

INSTRUCTIONS:
1. Generate a UNIQUE company with a fictional but realistic name from the provided options
2. Create realistic business metrics appropriate for the company stage (ARR, customers, ACV, NRR)
3. Include realistic team composition and funding history
4. Describe market position and competition
5. Include recent developments and strategic initiatives
6. CRITICALLY IMPORTANT: All KEY FACTORS must be clearly embedded in the narrative - these are the factors that affect the company's growth rate
7. Make the description read like an authentic investment memo or equity research note
8. Use professional business and finance terminology
9. Generate between 350-500 words
10. Do NOT include any growth rate estimates or percentage predictions
11. Vary the company characteristics significantly - don't always use similar metrics, team sizes, or funding amounts

Use random seed ${seed} for variation in your choices.

Generate the company profile now:`;

  return prompt;
}

/**
 * Generate a fallback description when LLM narrative generation fails or is disabled.
 * Returns a structured, deterministic description.
 */
export function generateFallbackDescription(
  config: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): string {
  const anchor = config.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const parts: string[] = [];

  // Start with the company type
  parts.push(`## Company Profile\n`);
  parts.push(`*Investment memo summary*\n`);
  parts.push(`Company Type: ${anchor.description}\n`);

  // Add each applied delta as a company characteristic
  if (appliedDeltaKeys.length > 0) {
    const characteristics = appliedDeltaKeys
      .map((key) => config.deltas[key]?.description)
      .filter(Boolean);

    parts.push(`\n**Key Factors:**`);
    for (const char of characteristics) {
      parts.push(`- ${char}`);
    }
  }

  // Add distractors as additional context
  if (distractors.length > 0) {
    parts.push(`\n**Additional Context:**`);
    for (const d of distractors) {
      parts.push(`- ${d}`);
    }
  }

  return parts.join("\n");
}

/**
 * Generate a brief summary for quick reference (non-LLM, deterministic)
 */
export function generateBriefSummary(
  config: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[]
): string {
  const anchor = config.anchors[anchorKey];
  if (!anchor) return "";

  const deltaDescriptions = appliedDeltaKeys
    .map((key) => config.deltas[key]?.description)
    .filter(Boolean);

  let summary = `${anchor.description}`;

  if (deltaDescriptions.length > 0) {
    summary += ` with ${deltaDescriptions.join(", ").toLowerCase()}`;
  }

  return summary;
}
