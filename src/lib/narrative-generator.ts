/**
 * LLM-Based Narrative Description Generator
 * 
 * Uses an LLM to generate rich, natural language descriptions that embed
 * the key factors (anchor + deltas) within realistic domain-specific narratives.
 * 
 * Supports multiple domains:
 * - Real Estate: Property prospectuses
 * - Financial Forecasting: Company analysis reports
 */

import type { DomainConfig } from "@/domains/schema";
import { generateText, type OpenRouterConfig } from "@/lib/openrouter";
import {
  locationProfiles,
  getAnchorCategory as getRealEstateCategory,
  getStreetsForAnchor,
} from "@/domains/real-estate-profiles";
import {
  companyProfiles,
  companyNameComponents,
  leadershipProfiles,
  productDescriptors,
  marketPositionDescriptors,
  getAnchorCategory as getFinancialCategory,
  getNameSuffixForAnchor,
} from "@/domains/financial-forecasting-profiles";

// Default model for narrative generation (fast and cheap)
const DEFAULT_NARRATIVE_MODEL = "openai/gpt-4o-mini";

export interface NarrativeGeneratorConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface GeneratedNarrative {
  description: string;
  briefSummary: string;
  latencyMs: number;
}

/**
 * Build a narrative prompt based on the domain type
 */
function buildNarrativePrompt(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): string {
  // Route to domain-specific prompt builder
  if (domain.id === "financial-forecasting") {
    return buildFinancialForecastingPrompt(domain, anchorKey, appliedDeltaKeys, distractors, seed);
  }
  
  // Default to real estate prompt
  return buildRealEstatePrompt(domain, anchorKey, appliedDeltaKeys, distractors, seed);
}

/**
 * Build prompt for financial forecasting domain (company analysis)
 */
function buildFinancialForecastingPrompt(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const profile = companyProfiles[anchorKey] || companyProfiles.saas_scaleup_growth;
  const category = getFinancialCategory(anchorKey);
  const nameSuffixes = getNameSuffixForAnchor(anchorKey);
  
  // Get delta descriptions with impact direction
  const deltaDetails = appliedDeltaKeys.map(key => {
    const delta = domain.deltas[key];
    return delta ? { 
      key, 
      description: delta.description, 
      impact: delta.value > 0 ? "increases growth rate" : "decreases growth rate" 
    } : null;
  }).filter(Boolean);

  // Build company context
  const companyContext = `
Company type: ${anchor.description}
Industry focus: ${profile.industries.join(", ")}
Business model: ${profile.businessModels.join(", ")}
Customer types: ${profile.customerTypes.join(", ")}
Company characteristics: ${profile.characteristics.join(", ")}
Funding stage: ${profile.fundingStages.join(" or ")}
Team size: ${profile.teamSizeRanges.join(" or ")}
Name prefix options: ${companyNameComponents.prefixes.slice(0, 8).join(", ")}
Name suffix options: ${nameSuffixes.join(", ")}
HQ location options: ${companyNameComponents.locations.slice(0, 6).join(", ")}
`.trim();

  // Build the key factors section
  let keyFactorsSection = "";
  if (deltaDetails.length > 0) {
    keyFactorsSection = `
KEY FACTORS TO EMBED (these MUST be clearly mentioned in the analysis as they affect the company's growth rate):
${deltaDetails.map((d, i) => `${i + 1}. ${d!.description} (${d!.impact})`).join("\n")}
`.trim();
  }

  // Build distractors section
  let distractorsSection = "";
  if (distractors.length > 0) {
    distractorsSection = `
ADDITIONAL DETAILS TO INCLUDE (these are supplementary background details, include them naturally but they should NOT affect growth estimation):
${distractors.map(d => `- ${d}`).join("\n")}
`.trim();
  }

  const prompt = `You are a financial analyst writing a company analysis report for a growth company. Generate a detailed, realistic company description that reads like a professional investor research note.

COMPANY CONTEXT:
${companyContext}

${keyFactorsSection}

${distractorsSection}

EXAMPLE FORMAT (follow this style closely):

"""
## Company Overview

**Nova Systems** is a B2B SaaS company headquartered in San Francisco, providing enterprise collaboration software to mid-market and Fortune 500 companies. Founded in 2019 by former executives from Slack and Atlassian, the company has grown to approximately 180 employees across offices in San Francisco, New York, and London.

## Business Model & Metrics

The company operates a subscription-based model with annual and multi-year enterprise contracts. Current ARR is approximately $28M, up from $18M in the prior year. The customer base includes 850+ paying accounts, with an average contract value (ACV) of approximately $33,000. The sales motion combines inbound marketing with a 40-person enterprise sales team, targeting IT and operations leaders at companies with 500-5,000 employees.

## Growth Dynamics

Recent performance has been characterized by strong new logo acquisition, with quarterly net new ARR averaging $3.2M. The company recently completed a Series B raise of $45M to accelerate go-to-market expansion, with plans to double the sales team over the next 12 months. International expansion into EMEA is underway, with early traction in UK and German markets.

The product team recently shipped a major platform upgrade enabling workflow automation, which has driven significant upsell opportunities within the existing customer base. Engineering velocity remains strong with bi-weekly release cycles. However, the sales team has experienced elevated turnover (35% annually), and several key account executives departed in Q3, which may create headwinds for quota attainment in the coming quarters.

Net revenue retention stands at 108%, reflecting moderate expansion but also some downgrades among SMB customers facing budget pressures. The company's primary competitor recently raised $200M and is increasing pricing pressure in the mid-market segment.

## Leadership & Culture

The executive team combines deep product expertise with enterprise sales experience. The CEO (ex-Slack) focuses on product strategy while the CRO (ex-Salesforce) leads commercial operations. The company emphasizes a remote-first culture and was recently recognized as a top workplace in the Bay Area.
"""

INSTRUCTIONS:
1. Generate a UNIQUE fictional company name using provided prefixes and suffixes
2. Create realistic business metrics (ARR/revenue, customer count, ACV, team size)
3. Include specific funding stage and approximate company age
4. CRITICALLY IMPORTANT: All KEY FACTORS must be clearly embedded in the narrative - these directly affect growth rate
5. Make the analysis read like an authentic investor research note or due diligence report
6. Use professional financial and business terminology
7. Generate between 400-600 words
8. Do NOT include any explicit growth rate estimates or percentage forecasts
9. Vary the company characteristics significantly between generations
10. Include both positive and negative factors as specified in the KEY FACTORS

Use random seed ${seed} for variation in your choices.

Generate the company analysis now:`;

  return prompt;
}

/**
 * Build prompt for real estate domain (property prospectus)
 */
function buildRealEstatePrompt(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const profile = locationProfiles[anchorKey] || locationProfiles.office_other;
  const streets = getStreetsForAnchor(anchorKey);
  
  // Get delta descriptions
  const deltaDetails = appliedDeltaKeys.map(key => {
    const delta = domain.deltas[key];
    return delta ? { key, description: delta.description, impact: delta.value > 0 ? "increases yield" : "decreases yield" } : null;
  }).filter(Boolean);

  // Build location context
  const locationContext = `
Location type: ${anchor.description}
Possible districts: ${profile.districts.join(", ")}
Nearby landmarks: ${profile.landmarks.join(", ")}
Transport options: ${profile.transport.join("; ")}
Area characteristics: ${profile.characteristics.join(", ")}
Possible street names: ${streets.slice(0, 5).join(", ")}
`.trim();

  // Build the key factors section
  let keyFactorsSection = "";
  if (deltaDetails.length > 0) {
    keyFactorsSection = `
KEY FACTORS TO EMBED (these MUST be clearly mentioned in the description as they affect the property's yield):
${deltaDetails.map((d, i) => `${i + 1}. ${d!.description}`).join("\n")}
`.trim();
  }

  // Build distractors section
  let distractorsSection = "";
  if (distractors.length > 0) {
    distractorsSection = `
ADDITIONAL DETAILS TO INCLUDE (these are supplementary details, include them naturally):
${distractors.map(d => `- ${d}`).join("\n")}
`.trim();
  }

  const prompt = `You are an expert commercial real estate analyst writing a property sales prospectus for a Norwegian commercial property.

Generate a detailed, realistic property description following the exact style and format shown in the example below. The description should read like a professional sales document from a real estate advisor.

PROPERTY CONTEXT:
${locationContext}

${keyFactorsSection}

${distractorsSection}

EXAMPLE FORMAT (follow this style closely):

"""
## Property Information

*Overview of property details, ownership, and certifications*

The property is located at Cort Adelers gate 16 in the Vika district of central Oslo, in the borough of Frogner, between Solli plass and Aker Brygge. According to the sales presentation, the building lies approximately 200 metres from both Solli plass and Nationaltheatret station, placing it within a dense, mixed-use inner-city fabric dominated by offices, retail, hospitality and cultural institutions. The immediate surroundings include embassies and other diplomatic functions in Cort Adelers gate, as well as proximity to the Nationaltheatret transport hub, Oslo City Hall and the Nasjonalmuseet, which together characterise the area as an established central business location with significant public and institutional presence. Public transport accessibility is strong with frequent tram and bus services from Solli plass and Observatoriegata, and all metro lines, regional rail and airport express services available from Nationaltheatret station. Road access is via the local street grid in Vika, with predominantly urban streetscape and closed perimeter blocks. The cadastral designation is gnr. 209, bnr. 13 in Oslo municipality, with an owned plot of 690 m², and the property is listed on the municipal "gul liste" for buildings of conservation interest.

The building is a corner office property originally constructed in 1955 and described as a funkisgård, an example of post-war functionalist architecture characterised by simple lines, large window surfaces and a functional layout. It comprises nine floors including basement, with a gross building area of approximately 4 006 m² BTA according to the sales presentation, while the structured data indicates a gross area of 3 768 m² and built-up area of 460,6 m², reflecting typical office floorplates around 470 m². The structure features concrete floor slabs and solid materials, and the plot is sloping so that the nominal first floor effectively corresponds to a raised second floor. Documented technical upgrades in recent years include installation of two new lifts in 2012, new external solar shading in 2016, upgraded entrance and staircase in 2017, new SD system for the ventilation unit in 2018, façade painting in 2019, and refurbishment of the first and seventh floors in 2019, the third, fourth and sixth floors in 2021, and the eighth floor in 2024. The building has an energy rating E (light green) and an estimated TEK classification linked to the 1924 building legislation (LBV 1924), while information on façade materials, interior material standards beyond being described as bright premises with large window surfaces, and detailed technical condition of building systems other than the noted upgrades is information not available in the context.

The property is regulated in the municipal master plan with main purpose "bebyggelse og anlegg (fremtidig)" and is used predominantly as an office building with supplementary restaurant and storage areas. The tenancy structure described in the presentation and structured data is dominated by office users within wholesale, professional services and other knowledge-intensive activities, with one restaurant unit at the lower level and additional storage in basement and mezzanine levels. Aggregated office areas per floor range from approximately 255 m² to 500 m², and the presentation notes both fully let floors and vacant office areas with a seller lease guarantee, indicating a combination of income-producing and currently vacant space, while precise current vacancy by percentage is information not available in the context. Property-level sustainability initiatives beyond the energy label E and general compliance with historical technical regulations are information not available in the context, and no additional environmental certifications such as BREEAM or LEED are reported in the provided material.
"""

INSTRUCTIONS:
1. Generate a UNIQUE property with a fictional but realistic address using one of the provided street names
2. Create realistic building specifications (year built, floors, size in m² BTA, construction type)
3. Include realistic cadastral references (gnr./bnr.) and plot sizes
4. Describe transport connections and nearby landmarks from the provided context
5. Include technical upgrade history with specific years
6. CRITICALLY IMPORTANT: All KEY FACTORS must be clearly embedded in the narrative - these are the factors that affect the property's market yield
7. Make the description read like an authentic Norwegian commercial real estate prospectus
8. Use professional real estate terminology and phrasing
9. Generate between 400-600 words
10. Do NOT include any yield estimates or percentage values
11. Vary the property characteristics significantly - don't always use similar years, sizes, or features

Use random seed ${seed} for variation in your choices.

Generate the property description now:`;

  return prompt;
}

/**
 * Generate a rich narrative property description using an LLM
 */
export async function generateNarrativeDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number,
  config: NarrativeGeneratorConfig
): Promise<GeneratedNarrative> {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const prompt = buildNarrativePrompt(
    domain,
    anchorKey,
    appliedDeltaKeys,
    distractors,
    seed
  );

  const openRouterConfig: OpenRouterConfig = {
    apiKey: config.apiKey,
    model: config.model || DEFAULT_NARRATIVE_MODEL,
    temperature: config.temperature ?? 0.8,
    maxTokens: 2048,
  };

  const result = await generateText(prompt, openRouterConfig);

  // Generate a brief summary for quick reference
  const briefSummary = generateBriefSummary(domain, anchorKey, appliedDeltaKeys);

  return {
    description: result.text.trim(),
    briefSummary,
    latencyMs: result.latencyMs,
  };
}

/**
 * Generate a brief summary suitable for quick reference (non-LLM, deterministic)
 */
export function generateBriefSummary(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[]
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) return "";

  const deltaDescriptions = appliedDeltaKeys
    .map(key => domain.deltas[key]?.description)
    .filter(Boolean);

  let summary = `${anchor.description}`;

  if (deltaDescriptions.length > 0) {
    summary += ` with ${deltaDescriptions.join(", ").toLowerCase()}`;
  }

  return summary;
}

/**
 * Fallback template-based description (for when LLM is not available)
 */
export function generateFallbackDescription(
  domain: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[]
): string {
  const anchor = domain.anchors[anchorKey];
  if (!anchor) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const parts: string[] = [];
  
  // Domain-specific headers
  const isFinancial = domain.id === "financial-forecasting";
  const headerTitle = isFinancial ? "## Company Overview" : "## Property Information";
  const headerSubtitle = isFinancial ? "*Overview of company profile*" : "*Overview of property details*";
  const typeLabel = isFinancial ? "Company Type" : "Property Type";
  const factorsLabel = isFinancial ? "**Growth Factors:**" : "**Key Characteristics:**";

  parts.push(`${headerTitle}\n`);
  parts.push(`${headerSubtitle}\n`);
  parts.push(`${typeLabel}: ${anchor.description}\n`);

  // Add each applied delta as a characteristic/factor
  if (appliedDeltaKeys.length > 0) {
    const characteristics = appliedDeltaKeys
      .map(key => domain.deltas[key]?.description)
      .filter(Boolean);
    
    parts.push(`\n${factorsLabel}`);
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
 * Batch generate narratives for multiple scenarios (parallel processing)
 */
export async function generateNarrativesBatch(
  domain: DomainConfig,
  scenarios: Array<{
    anchorKey: string;
    appliedDeltaKeys: string[];
    distractors: string[];
    seed: number;
  }>,
  config: NarrativeGeneratorConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedNarrative[]> {
  const results: GeneratedNarrative[] = new Array(scenarios.length);
  const BATCH_SIZE = 5; // Process 5 narratives in parallel
  let completedCount = 0;

  for (let batchStart = 0; batchStart < scenarios.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, scenarios.length);
    const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);

    // Generate narratives for this batch in parallel
    const batchPromises = batchIndices.map(async (i) => {
      const scenario = scenarios[i];
      
      try {
        const narrative = await generateNarrativeDescription(
          domain,
          scenario.anchorKey,
          scenario.appliedDeltaKeys,
          scenario.distractors,
          scenario.seed,
          config
        );
        return { index: i, narrative };
      } catch (error) {
        // Fallback to template-based generation on error
        console.error(`Failed to generate narrative for scenario ${i}:`, error);
        return {
          index: i,
          narrative: {
            description: generateFallbackDescription(
              domain,
              scenario.anchorKey,
              scenario.appliedDeltaKeys,
              scenario.distractors
            ),
            briefSummary: generateBriefSummary(domain, scenario.anchorKey, scenario.appliedDeltaKeys),
            latencyMs: 0,
          },
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Store results in correct positions
    for (const { index, narrative } of batchResults) {
      results[index] = narrative;
    }

    completedCount = batchEnd;
    onProgress?.(completedCount, scenarios.length);

    // Small delay between batches to avoid rate limiting
    if (batchEnd < scenarios.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
