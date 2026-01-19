# Domain Plugin Architecture Plan

## Objective

Refactor the estimation playground to support multiple domains through a **plugin architecture** where each domain is a self-contained module with its own configuration, facts, profiles, narrative generation, and prompt templates.

## Current State

The system is tightly coupled to real estate:
- `narrative-generator.ts` imports `real-estate-profiles.ts` directly
- Prompt templates reference real estate concepts ("yield", "property", "lease")
- Facts structure assumes real estate knowledge (lease_risk, tenant_quality)
- UI labels are hardcoded ("Yield", "Property Context")
- Tolerance is hardcoded at 0.35% (appropriate for yields, not growth rates)

## Target Architecture

```
src/domains/
  index.ts                          # Domain registry and loader
  types.ts                          # Shared domain interfaces
  
  real-estate/
    config.json                     # Anchors, deltas, distractors
    facts.json                      # Expert knowledge
    profiles.ts                     # Location/building data for narratives
    narrative.ts                    # Domain-specific narrative builder
    prompts/
      chain-of-thought.mustache     # Domain-specific templates
      persona.mustache
      few-shot.mustache
      minimal.mustache
    examples.json                   # Few-shot examples for this domain
    
  financial/
    config.json
    facts.json
    profiles.ts                     # Company archetypes, industries
    narrative.ts
    prompts/
      chain-of-thought.mustache
      persona.mustache
      few-shot.mustache
      minimal.mustache
    examples.json
```

---

## Implementation Sessions

### Session A1: Domain Type System & Registry

**Objective:** Create the type system and registry for loading domain plugins.

**Key Files:**
- CREATE `src/domains/types.ts` - Shared domain interfaces
- CREATE `src/domains/index.ts` - Domain registry and loader
- MODIFY `src/domains/schema.ts` - Extend DomainConfig with new fields
- MODIFY `src/lib/storage.ts` - Update domain loading to use registry

**Requirements:**

1. **Extended Domain Config Schema:**
```typescript
// In schema.ts or types.ts
export const DomainConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  outputUnit: z.string(),
  
  // NEW: UI labels
  outputLabel: z.string().default("Estimate"),    // "Yield" | "Growth Rate"
  entityLabel: z.string().default("Subject"),      // "Property" | "Company"
  scenarioLabel: z.string().default("Scenario"),   // "Property Details" | "Company Profile"
  
  // NEW: Tolerance configuration
  toleranceMode: z.enum(["fixed", "percentage"]).default("fixed"),
  toleranceValue: z.number().default(0.35),        // Fixed: ±0.35, Percentage: ±5%
  
  // Existing fields
  anchors: z.record(z.string(), AnchorSchema),
  deltas: z.record(z.string(), DeltaSchema),
  distractors: z.array(z.string()),
});
```

2. **Domain Plugin Interface:**
```typescript
// In types.ts
export interface DomainPlugin {
  config: DomainConfig;
  facts: ExpertFacts;
  
  // Narrative generation
  buildNarrativePrompt: (
    anchorKey: string,
    appliedDeltaKeys: string[],
    distractors: string[],
    seed: number
  ) => string;
  
  generateFallbackDescription: (
    anchorKey: string,
    appliedDeltaKeys: string[],
    distractors: string[]
  ) => string;
  
  // Few-shot examples for prompts
  getExamples: () => Array<{
    description: string;
    analysis: string;
    result: { reasoning: string; estimate: number };
  }>;
  
  // Prompt templates (domain-specific versions)
  getPromptTemplates: () => PromptTemplate[];
}
```

3. **Domain Registry:**
```typescript
// In index.ts
const domainRegistry: Map<string, DomainPlugin> = new Map();

export function registerDomain(plugin: DomainPlugin): void;
export function getDomain(id: string): DomainPlugin | null;
export function listDomains(): Array<{ id: string; name: string; description: string }>;
export async function loadDomain(id: string): Promise<DomainPlugin>;
```

**Success Criteria:**
- Domain plugins can be registered and retrieved
- Domain config includes UI labels and tolerance configuration
- `listDomains()` returns all registered domains with metadata

---

### Session A2: Real Estate Domain Plugin

**Objective:** Extract existing real estate logic into the plugin structure.

**Key Files:**
- CREATE `src/domains/real-estate/index.ts` - Plugin entry point
- MOVE `src/domains/real-estate.json` → `src/domains/real-estate/config.json`
- MOVE `src/domains/real-estate.facts.json` → `src/domains/real-estate/facts.json`
- MOVE `src/domains/real-estate-profiles.ts` → `src/domains/real-estate/profiles.ts`
- CREATE `src/domains/real-estate/narrative.ts` - Extract from narrative-generator.ts
- CREATE `src/domains/real-estate/examples.json` - Few-shot examples
- CREATE `src/domains/real-estate/prompts/*.mustache` - Domain-specific templates

**Requirements:**

1. **Plugin Entry Point (`index.ts`):**
```typescript
import config from './config.json';
import facts from './facts.json';
import { buildNarrativePrompt, generateFallbackDescription } from './narrative';
import { getExamples } from './examples';
import { getPromptTemplates } from './prompts';

export const realEstatePlugin: DomainPlugin = {
  config: {
    ...config,
    outputLabel: "Yield",
    entityLabel: "Property",
    scenarioLabel: "Property Details",
    toleranceMode: "fixed",
    toleranceValue: 0.35,
  },
  facts,
  buildNarrativePrompt,
  generateFallbackDescription,
  getExamples,
  getPromptTemplates,
};
```

2. **Narrative Module (`narrative.ts`):**
- Extract `buildNarrativePrompt` from current `narrative-generator.ts`
- Keep all Norwegian real estate specifics (streets, landmarks, building types)
- Export domain-specific prompt builder

3. **Update config.json with new fields:**
```json
{
  "id": "real-estate-yield",
  "name": "Norwegian Commercial Real Estate Yield",
  "outputLabel": "Yield",
  "entityLabel": "Property",
  "scenarioLabel": "Property Details",
  "toleranceMode": "fixed",
  "toleranceValue": 0.35,
  ...
}
```

4. **Domain-Specific Templates:**
Move existing templates but adapt to use domain-agnostic response format:
```mustache
Return JSON only: {"reasoning": "<analysis>", "{{domain.outputLabel | lowercase}}": <number>}
```

**Success Criteria:**
- Real estate plugin loads and works identically to current system
- All existing benchmarks produce same results
- No breaking changes to stored runs

---

### Session A3: Financial Domain Plugin

**Objective:** Create the financial forecasting domain plugin.

**Key Files:**
- CREATE `src/domains/financial/index.ts` - Plugin entry point
- MOVE `src/domains/financial-forecasting.json` → `src/domains/financial/config.json`
- CREATE `src/domains/financial/facts.json` - Expert knowledge
- CREATE `src/domains/financial/profiles.ts` - Company archetypes, industries
- CREATE `src/domains/financial/narrative.ts` - Investment memo style narratives
- CREATE `src/domains/financial/examples.json` - Few-shot examples
- CREATE `src/domains/financial/prompts/*.mustache` - Domain-specific templates

**Requirements:**

1. **Config Updates (`config.json`):**
```json
{
  "id": "financial-forecasting",
  "name": "Company Revenue Growth Rate Estimation",
  "outputLabel": "Growth Rate",
  "entityLabel": "Company",
  "scenarioLabel": "Company Profile",
  "toleranceMode": "percentage",
  "toleranceValue": 10,
  ...existing anchors, deltas, distractors...
}
```

2. **Expert Facts (`facts.json`):**
```json
{
  "domainId": "financial-forecasting",
  "facts": [
    {
      "name": "benchmarks",
      "content": "### Revenue Growth Benchmarks by Company Stage\n\n**SaaS Companies:**\n- Seed/Series A (<$5M ARR): 70-100%+ annual growth\n- Series B/C ($5M-$50M ARR): 40-70% annual growth\n- Enterprise ($50M+ ARR): 20-35% annual growth\n\n**E-commerce:**\n- Startup (early stage): 80-150%+ growth\n- Scale-up ($10M-$100M): 30-60% growth\n- Enterprise ($100M+): 10-25% growth\n\n**Traditional Industries:**\n- Manufacturing SMB: 3-12% growth\n- Retail SMB: 5-15% growth\n- Professional Services: 10-25% growth"
    },
    {
      "name": "retention_metrics",
      "content": "### Net Revenue Retention (NRR) Impact\n\nNRR is the strongest predictor of sustainable growth:\n\n- **World-class (>130% NRR):** Expansion revenue exceeds churn significantly. Companies can grow 20-30% even with minimal new customer acquisition.\n- **Excellent (110-130% NRR):** Healthy expansion, low churn. Growth compounding effect.\n- **Good (100-110% NRR):** Stable but growth requires constant new customer acquisition.\n- **Concerning (90-100% NRR):** Revenue leakage, need to run hard to stay in place.\n- **Critical (<90% NRR):** Fundamental product-market fit or pricing issue."
    },
    {
      "name": "market_factors",
      "content": "### Market Condition Multipliers\n\n**Expansion Phase:**\n- Geographic expansion: +8-15% to growth rate\n- New product lines: +5-12% to growth rate\n- Channel diversification: +3-8% to growth rate\n\n**Contraction Signals:**\n- Market exit: -10-20% to growth rate\n- Competitor disruption: -5-15% to growth rate\n- Regulatory headwinds: -5-10% to growth rate"
    },
    {
      "name": "operational_factors",
      "content": "### Operational Growth Drivers\n\n**Sales Capacity:**\n- Scaling sales team 2x+: Expect 6-18 month lag before revenue impact\n- High quota attainment (>80%): Sales motion working, can invest more\n- Low quota attainment (<50%): Product-market or go-to-market issues\n\n**Product Innovation:**\n- Major platform release: +5-15% growth if successful\n- Feature parity gaps: -5-10% as competitors win deals"
    },
    {
      "name": "methodology",
      "content": "### Growth Estimation Methodology\n\n**Step 1: Identify Base Growth Rate**\nSelect benchmark based on company stage, industry, and current scale.\n\n**Step 2: Apply Operational Adjustments**\n- NRR impact (most important for SaaS)\n- Sales efficiency metrics\n- Product roadmap execution\n\n**Step 3: Apply Market Adjustments**\n- Geographic/segment expansion or contraction\n- Competitive dynamics\n- Macro-economic factors\n\n**Step 4: Sanity Check**\n- Is the growth rate sustainable given burn rate?\n- Does it align with Rule of 40 expectations?\n- Are there any ceiling effects (market size)?"
    },
    {
      "name": "rule_of_40",
      "content": "### Rule of 40 Context\n\nThe Rule of 40 states that a healthy SaaS company's growth rate + profit margin should exceed 40%.\n\n- **Growth Rate 80%, Margin -40%:** Acceptable for early stage (80-40=40)\n- **Growth Rate 30%, Margin 15%:** Healthy for scale-up (30+15=45)\n- **Growth Rate 10%, Margin 25%:** Mature company (10+25=35, slightly below)\n\nCompanies below Rule of 40 may face valuation pressure, affecting investment in growth."
    }
  ]
}
```

3. **Company Profiles (`profiles.ts`):**
```typescript
export interface CompanyProfile {
  industries: string[];
  stages: string[];
  characteristics: string[];
  metrics: string[];
}

export const companyProfiles: Record<string, CompanyProfile> = {
  saas_startup_growth: {
    industries: ["B2B SaaS", "Developer Tools", "Vertical SaaS", "Infrastructure"],
    stages: ["Seed", "Series A", "Pre-Series B"],
    characteristics: ["product-led growth", "founder-led sales", "early enterprise traction"],
    metrics: ["$500K-$5M ARR", "2-3x YoY growth", "high burn multiple"]
  },
  // ... more profiles
};

export const companyNames = {
  saas: ["Acme Software", "CloudScale", "DataFlow", "Nexus Platform", ...],
  fintech: ["PayStream", "LendTech", "WealthOS", "CryptoCore", ...],
  // ...
};

export const founderBackgrounds = [...];
export const investorNames = [...];
export const marketSegments = [...];
```

4. **Narrative Generator (`narrative.ts`):**
```typescript
export function buildNarrativePrompt(
  config: DomainConfig,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number
): string {
  // Generate investment memo style narrative
  // Include: company background, metrics, market position, team, recent developments
  return `You are an equity research analyst writing an investment memo...`;
}
```

5. **Domain-Specific Templates (`prompts/`):**

**chain-of-thought.mustache:**
```mustache
You are analyzing a company to estimate its annual revenue growth rate.

{{#facts.benchmarks}}
{{{content}}}
{{/facts.benchmarks}}

---

### Company Profile

{{scenario.contextDescription}}

---

### Instructions

Work through this analysis step by step:

**Step 1: Identify the Benchmark**
- What stage and industry is this company?
- What is the benchmark growth rate range?

**Step 2: Position Within Range**
- Is this a high or low performer within its cohort?
- Where should it sit within the benchmark range?

**Step 3: Apply Adjustments**
Consider each factor and whether it pushes growth UP or DOWN:
- Net Revenue Retention (NRR)
- Sales capacity and efficiency
- Market expansion or contraction
- Product innovation velocity
- Macro-economic conditions

**Step 4: Calculate Final Growth Rate**
- Start with your positioned benchmark
- Add/subtract adjustments
- State your final growth rate estimate

Return your answer as JSON only, no markdown:
{"reasoning": "<your step-by-step reasoning>", "growth_rate": <number>}
```

**Success Criteria:**
- Financial domain loads and generates scenarios
- Scenarios have appropriate tolerance (percentage-based, ~10%)
- Narratives read like investment memos
- Prompt templates use financial terminology

---

### Session A4: Core System Integration

**Objective:** Update the core system to use the plugin architecture.

**Key Files:**
- MODIFY `src/lib/narrative-generator.ts` - Delegate to domain plugins
- MODIFY `src/lib/generator.ts` - Use domain tolerance config
- MODIFY `src/lib/storage.ts` - Use domain registry
- MODIFY `src/prompts/engine.ts` - Load domain-specific templates
- CREATE `src/app/api/domains/route.ts` - API endpoint for listing domains

**Requirements:**

1. **Narrative Generator Refactor:**
```typescript
// narrative-generator.ts becomes a thin dispatcher
import { getDomain } from '@/domains';

export async function generateNarrativeDescription(
  domainId: string,
  anchorKey: string,
  appliedDeltaKeys: string[],
  distractors: string[],
  seed: number,
  config: NarrativeGeneratorConfig
): Promise<GeneratedNarrative> {
  const domain = getDomain(domainId);
  if (!domain) throw new Error(`Unknown domain: ${domainId}`);
  
  const prompt = domain.buildNarrativePrompt(anchorKey, appliedDeltaKeys, distractors, seed);
  
  // Call LLM with domain-specific prompt
  const result = await generateText(prompt, openRouterConfig);
  
  return {
    description: result.text.trim(),
    briefSummary: domain.generateFallbackDescription(anchorKey, appliedDeltaKeys, distractors),
    latencyMs: result.latencyMs,
  };
}
```

2. **Generator Tolerance:**
```typescript
// In generator.ts, calculateGroundTruth or generateScenarios
function calculateTolerance(domain: DomainConfig, groundTruthValue: number): number {
  if (domain.toleranceMode === "percentage") {
    return groundTruthValue * (domain.toleranceValue / 100);
  }
  return domain.toleranceValue; // fixed
}
```

3. **Prompt Template Loading:**
```typescript
// In engine.ts or storage.ts
export async function listPromptTemplates(domainId?: string): Promise<PromptTemplate[]> {
  if (domainId) {
    const domain = getDomain(domainId);
    if (domain) {
      return domain.getPromptTemplates();
    }
  }
  // Fallback to generic templates
  return loadGenericTemplates();
}
```

4. **Domains API Endpoint:**
```typescript
// src/app/api/domains/route.ts
import { listDomains } from '@/domains';

export async function GET() {
  const domains = listDomains();
  return NextResponse.json(domains);
}
```

**Success Criteria:**
- Both domains work through the unified system
- Tolerance calculation respects domain config
- Domain-specific templates load correctly
- API returns list of available domains

---

### Session A5: UI Integration

**Objective:** Update the UI to support multi-domain operation.

**Key Files:**
- MODIFY `src/app/playground/page.tsx` - Add domain selector, use dynamic labels
- MODIFY `src/app/page.tsx` - Add domain filter column
- MODIFY `src/app/runs/[id]/page.tsx` - Use domain labels for display
- CREATE `src/components/domain-selector.tsx` - Reusable domain dropdown

**Requirements:**

1. **Domain Selector Component:**
```typescript
// domain-selector.tsx
interface DomainSelectorProps {
  value: string;
  onChange: (domainId: string) => void;
  disabled?: boolean;
}

export function DomainSelector({ value, onChange, disabled }: DomainSelectorProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  
  useEffect(() => {
    fetch('/api/domains')
      .then(res => res.json())
      .then(setDomains);
  }, []);
  
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select domain..." />
      </SelectTrigger>
      <SelectContent>
        {domains.map(domain => (
          <SelectItem key={domain.id} value={domain.id}>
            {domain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

2. **Playground Page Updates:**
- Add domain selector above model selector
- Load domain-specific templates when domain changes
- Filter test sets by domain
- Use `domain.outputLabel` in results display
- Persist selected domain in localStorage

3. **Dashboard Updates:**
- Add "Domain" column to runs table
- Add domain filter dropdown
- Show domain badge on each run

4. **Run Detail Page Updates:**
- Display domain name in header
- Use `domain.outputLabel` for prediction labels ("Yield" vs "Growth Rate")
- Use `domain.entityLabel` in scenario display

5. **Dynamic Labels Pattern:**
```typescript
// Fetch domain config and use throughout
const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null);

// In render:
<div className="text-2xl font-bold">
  {result.meanPrediction.toFixed(2)}{domainConfig?.outputUnit}
</div>
<div className="text-xs">
  {domainConfig?.outputLabel || "Estimate"} Error: ...
</div>
```

**Success Criteria:**
- Domain selector appears in playground
- Switching domains loads appropriate templates and test sets
- Run results display correct labels for each domain
- Dashboard can filter by domain

---

### Session A6: Test Sets & Scripts

**Objective:** Update test set handling and batch scripts for multi-domain support.

**Key Files:**
- MODIFY `src/app/api/test-sets/route.ts` - Validate domain exists
- MODIFY `scripts/batch-test.js` - Accept domain parameter
- MODIFY `scripts/run-testset.js` - Domain-aware execution
- MODIFY `scripts/create-testset-from-run.js` - Preserve domain metadata

**Requirements:**

1. **Test Set API Updates:**
- Validate domain exists before creating test set
- Return domain info in test set metadata
- Support filtering test sets by domain in GET

2. **Batch Test Script:**
```bash
# Usage
node scripts/batch-test.js --testset baseline-v1 --domain real-estate-yield
node scripts/batch-test.js --testset financial-baseline --domain financial-forecasting
```

3. **Test Set Domain Validation:**
- When loading a test set, verify its domain still exists
- Warn if running a test set against wrong domain templates

**Success Criteria:**
- Test sets are created with correct domain
- Scripts accept domain parameter
- Domain mismatch produces clear warning

---

## Migration Strategy

1. **Phase 1 (Sessions A1-A2):** Create plugin architecture, migrate real estate
   - All existing functionality continues working
   - Real estate is now loaded as a plugin

2. **Phase 2 (Session A3):** Add financial domain
   - New domain available alongside real estate
   - Can create test sets for financial domain

3. **Phase 3 (Sessions A4-A5):** Update core system and UI
   - UI supports domain switching
   - Narrative generation uses plugins

4. **Phase 4 (Session A6):** Update scripts and finalize
   - Batch testing works for both domains
   - Documentation updated

## Backward Compatibility

- Existing runs with `domainId: "real-estate-yield"` continue to work
- Old test sets load correctly
- No schema migrations required for stored data

## Success Criteria (Overall)

1. Can switch between real estate and financial domains in playground
2. Each domain has its own:
   - Anchors, deltas, distractors
   - Expert facts
   - Narrative generation style
   - Prompt templates
   - Tolerance configuration
3. UI displays domain-appropriate labels
4. Test sets are domain-specific
5. Existing real estate benchmarks produce identical results
6. Both domains can generate narratives with appropriate style

---

## File Inventory

### New Files
- `src/domains/types.ts`
- `src/domains/index.ts`
- `src/domains/real-estate/index.ts`
- `src/domains/real-estate/narrative.ts`
- `src/domains/real-estate/examples.json`
- `src/domains/real-estate/prompts/*.mustache` (6 files)
- `src/domains/financial/index.ts`
- `src/domains/financial/config.json`
- `src/domains/financial/facts.json`
- `src/domains/financial/profiles.ts`
- `src/domains/financial/narrative.ts`
- `src/domains/financial/examples.json`
- `src/domains/financial/prompts/*.mustache` (6 files)
- `src/app/api/domains/route.ts`
- `src/components/domain-selector.tsx`

### Modified Files
- `src/domains/schema.ts` - Extended DomainConfig
- `src/lib/narrative-generator.ts` - Delegate to plugins
- `src/lib/generator.ts` - Dynamic tolerance
- `src/lib/storage.ts` - Use domain registry
- `src/prompts/engine.ts` - Domain-specific template loading
- `src/app/playground/page.tsx` - Domain selector, dynamic labels
- `src/app/page.tsx` - Domain filter column
- `src/app/runs/[id]/page.tsx` - Domain-aware labels
- `src/app/api/test-sets/route.ts` - Domain validation
- `scripts/batch-test.js` - Domain parameter
- `scripts/run-testset.js` - Domain-aware
- `scripts/create-testset-from-run.js` - Preserve domain

### Moved Files
- `src/domains/real-estate.json` → `src/domains/real-estate/config.json`
- `src/domains/real-estate.facts.json` → `src/domains/real-estate/facts.json`
- `src/domains/real-estate-profiles.ts` → `src/domains/real-estate/profiles.ts`
- `src/domains/financial-forecasting.json` → `src/domains/financial/config.json`
