#!/usr/bin/env node

/**
 * Test GPT models with current and improved chain-of-thought prompts
 *
 * Comparing:
 * - GPT-4o vs GPT-4o-mini
 * - Current chain-of-thought vs Enhanced chain-of-thought
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

// Models to test
const MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o-mini' },
];

// Enhanced chain-of-thought prompt with explicit calculations
const ENHANCED_COT_PROMPT = `You are a senior Norwegian commercial real estate analyst estimating market yields.

{{#facts.benchmarks}}
{{{content}}}
{{/facts.benchmarks}}

---

### Property to Analyze

{{scenario.contextDescription}}

---

### Your Task

Follow this structured methodology to estimate the market yield:

**Step 1: Identify Base Benchmark**
- Which property segment does this belong to? (e.g., "Office Oslo Centre", "Logistics Prime")
- What is the benchmark yield range?
- Choose your starting point within that range (typically the midpoint unless clearly prime/secondary)

**Step 2: Identify All Adjustment Factors**
List each factor that affects yield and its direction:
- Tenant quality (AAA/government = DOWN, SME single tenant = UP)
- Lease length (>10yr WAULT = DOWN, <3yr = UP)
- Building condition (modern/certified = DOWN, old/needs capex = UP)
- Location quality (exceptional micro-location = DOWN, poor access = UP)
- Vacancy risk (>20% vacancy = UP)
- Diversification (3+ tenants = DOWN)

**Step 3: Calculate with Explicit Arithmetic**
Show your calculation step by step:

Base: [X.XX]%
± [Factor 1]: [+/-0.XX]%
± [Factor 2]: [+/-0.XX]%
± [Factor 3]: [+/-0.XX]%
= Final: [X.XX]%

**Step 4: Validation Check**
- Is the final yield reasonable for this property type?
- Are all material risk factors accounted for?
- Does the direction of adjustments make sense?

**Step 5: Return Result**
Return ONLY valid JSON (no markdown, no code blocks):
{"yield": <number>, "reasoning": "<your analysis with explicit calculation from Step 3>"}

CRITICAL: Your reasoning MUST include the explicit arithmetic calculation from Step 3.`;

// Test configuration
const CONFIG = {
  scenarioCount: 6,
  generateTwins: true,
  rolloutsPerScenario: 3,
  domainId: 'real-estate-yield',
};

async function saveEnhancedPrompt() {
  console.log('📝 Saving enhanced prompt template...');
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'chain-of-thought-enhanced',
      template: ENHANCED_COT_PROMPT,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save template: ${await response.text()}`);
  }
  console.log('✅ Enhanced prompt saved\n');
}

async function runBenchmark(model, promptName, promptTemplate) {
  console.log(`🚀 Running ${model.name} with ${promptName}...`);

  const response = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domainId: CONFIG.domainId,
      model: model.id,
      promptTemplate: promptTemplate,
      promptTemplateId: promptName,
      scenarioCount: CONFIG.scenarioCount,
      generateTwins: CONFIG.generateTwins,
      rolloutsPerScenario: CONFIG.rolloutsPerScenario,
      seed: 42424242, // Fixed seed for reproducibility
      useNarrativeDescriptions: true,
      narrativeModel: 'openai/gpt-4o-mini',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Benchmark failed: ${error}`);
  }

  const run = await response.json();

  console.log(`✅ Completed: ${run.id}`);
  console.log(`   Hit Rate: ${run.aggregateMetrics.hitRate}%`);
  console.log(`   RMSE: ${run.aggregateMetrics.rmse}`);
  console.log(`   Mean Error: ${run.aggregateMetrics.meanError}`);
  console.log(`   Consistency: ${run.aggregateMetrics.avgConsistency}%`);
  console.log(`   Latency: ${run.aggregateMetrics.avgLatencyMs}ms`);

  if (run.aggregateMetrics.directionalAccuracy !== undefined) {
    console.log(`   Directional: ${run.aggregateMetrics.directionalAccuracy}%`);
  }
  console.log();

  return run;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 GPT Model + Prompt Engineering Analysis');
  console.log('='.repeat(70));
  console.log('\nTesting:');
  console.log('  Models: GPT-4o, GPT-4o-mini');
  console.log('  Prompts: Current CoT, Enhanced CoT');
  console.log('  Config: 6 scenarios, 3 rollouts, fixed seed\n');

  // Save enhanced prompt
  await saveEnhancedPrompt();

  // Get current chain-of-thought prompt
  const cotResponse = await fetch(`${API_BASE}/templates?name=chain-of-thought`);
  const { template: currentCoT } = await cotResponse.json();

  const results = [];

  // Test matrix: 2 models × 2 prompts = 4 runs
  const testCases = [
    { model: MODELS[1], promptName: 'chain-of-thought', prompt: currentCoT },
    { model: MODELS[1], promptName: 'chain-of-thought-enhanced', prompt: ENHANCED_COT_PROMPT },
    { model: MODELS[0], promptName: 'chain-of-thought', prompt: currentCoT },
    { model: MODELS[0], promptName: 'chain-of-thought-enhanced', prompt: ENHANCED_COT_PROMPT },
  ];

  for (const { model, promptName, prompt } of testCases) {
    try {
      const run = await runBenchmark(model, promptName, prompt);
      results.push({
        model: model.name,
        modelId: model.id,
        prompt: promptName,
        runId: run.id,
        metrics: run.aggregateMetrics,
      });

      // Delay between runs
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
      results.push({
        model: model.name,
        modelId: model.id,
        prompt: promptName,
        error: error.message,
      });
    }
  }

  // Print comparison table
  console.log('='.repeat(70));
  console.log('📊 RESULTS COMPARISON');
  console.log('='.repeat(70));
  console.log();

  console.log('┌──────────────────┬─────────────────────────┬─────────┬────────┬───────────┐');
  console.log('│ Model            │ Prompt                  │ Hit%    │ RMSE   │ Consist%  │');
  console.log('├──────────────────┼─────────────────────────┼─────────┼────────┼───────────┤');

  for (const result of results) {
    if (result.error) {
      console.log(`│ ${result.model.padEnd(16)} │ ${result.prompt.padEnd(23)} │ ERROR                           │`);
    } else {
      const model = result.model.padEnd(16);
      const prompt = result.prompt === 'chain-of-thought' ? 'CoT (current)' : 'CoT (enhanced)';
      const hit = result.metrics.hitRate.toFixed(1).padStart(5);
      const rmse = result.metrics.rmse.toFixed(2).padStart(4);
      const consist = result.metrics.avgConsistency?.toFixed(1).padStart(5) || 'N/A';
      console.log(`│ ${model} │ ${prompt.padEnd(23)} │ ${hit}%  │ ${rmse}   │ ${consist}%    │`);
    }
  }

  console.log('└──────────────────┴─────────────────────────┴─────────┴────────┴───────────┘');

  // Calculate improvements
  console.log('\n📈 IMPROVEMENT ANALYSIS');
  console.log('─'.repeat(70));

  const gpt4oMiniCurrent = results.find(r => r.model === 'GPT-4o-mini' && r.prompt === 'chain-of-thought');
  const gpt4oMiniEnhanced = results.find(r => r.model === 'GPT-4o-mini' && r.prompt === 'chain-of-thought-enhanced');
  const gpt4oCurrent = results.find(r => r.model === 'GPT-4o' && r.prompt === 'chain-of-thought');
  const gpt4oEnhanced = results.find(r => r.model === 'GPT-4o' && r.prompt === 'chain-of-thought-enhanced');

  if (gpt4oMiniCurrent && gpt4oMiniEnhanced && !gpt4oMiniCurrent.error && !gpt4oMiniEnhanced.error) {
    const hitImprovement = gpt4oMiniEnhanced.metrics.hitRate - gpt4oMiniCurrent.metrics.hitRate;
    const rmseImprovement = gpt4oMiniCurrent.metrics.rmse - gpt4oMiniEnhanced.metrics.rmse;
    console.log('\nGPT-4o-mini: Current → Enhanced');
    console.log(`  Hit Rate: ${gpt4oMiniCurrent.metrics.hitRate.toFixed(1)}% → ${gpt4oMiniEnhanced.metrics.hitRate.toFixed(1)}% (${hitImprovement > 0 ? '+' : ''}${hitImprovement.toFixed(1)}pp)`);
    console.log(`  RMSE: ${gpt4oMiniCurrent.metrics.rmse.toFixed(2)} → ${gpt4oMiniEnhanced.metrics.rmse.toFixed(2)} (${rmseImprovement > 0 ? '-' : '+'}${Math.abs(rmseImprovement).toFixed(2)})`);
  }

  if (gpt4oCurrent && gpt4oEnhanced && !gpt4oCurrent.error && !gpt4oEnhanced.error) {
    const hitImprovement = gpt4oEnhanced.metrics.hitRate - gpt4oCurrent.metrics.hitRate;
    const rmseImprovement = gpt4oCurrent.metrics.rmse - gpt4oEnhanced.metrics.rmse;
    console.log('\nGPT-4o: Current → Enhanced');
    console.log(`  Hit Rate: ${gpt4oCurrent.metrics.hitRate.toFixed(1)}% → ${gpt4oEnhanced.metrics.hitRate.toFixed(1)}% (${hitImprovement > 0 ? '+' : ''}${hitImprovement.toFixed(1)}pp)`);
    console.log(`  RMSE: ${gpt4oCurrent.metrics.rmse.toFixed(2)} → ${gpt4oEnhanced.metrics.rmse.toFixed(2)} (${rmseImprovement > 0 ? '-' : '+'}${Math.abs(rmseImprovement).toFixed(2)})`);
  }

  // Include Gemini 3 Flash baseline
  console.log('\n📌 BASELINE COMPARISON (from previous test)');
  console.log('─'.repeat(70));
  console.log('Gemini 3 Flash + CoT (current): 90.0% hit rate, 0.24 RMSE');

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(__dirname, 'knowledge', `gpt-prompt-comparison-${timestamp}.json`);

  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    models: MODELS,
    prompts: {
      current: 'chain-of-thought',
      enhanced: 'chain-of-thought-enhanced',
    },
    results,
    baseline: {
      model: 'Gemini 3 Flash',
      prompt: 'chain-of-thought',
      hitRate: 90.0,
      rmse: 0.24,
    },
  }, null, 2));

  console.log(`\n💾 Results saved to: ${outputFile}`);
  console.log('\n🔍 Run IDs for detailed analysis:');
  results.filter(r => !r.error).forEach(r => {
    console.log(`   ${r.model} + ${r.prompt}: ${r.runId}`);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
