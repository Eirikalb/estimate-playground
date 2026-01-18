#!/usr/bin/env node

/**
 * Test script to evaluate Gemini models on real estate yield estimation
 *
 * This script will run multiple scenarios with different Gemini models
 * to analyze their performance, failure modes, and consistency.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

// Gemini models to test
const GEMINI_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
];

// Prompt templates to test
const PROMPT_TEMPLATES = [
  'minimal',
  'benchmark-only',
  'chain-of-thought',
];

// Configuration
const CONFIG = {
  scenarioCount: 6,  // Small set for focused analysis
  generateTwins: true,
  rolloutsPerScenario: 3,  // Multiple rollouts to measure consistency
  domainId: 'real-estate-yield',
};

async function runBenchmark(model, promptTemplateId) {
  console.log(`\n🚀 Running ${model.name} with ${promptTemplateId} prompt...`);

  // Get the template
  const templateRes = await fetch(`${API_BASE}/templates?name=${promptTemplateId}`);
  const { template } = await templateRes.json();

  // Create and run the benchmark
  const response = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domainId: CONFIG.domainId,
      model: model.id,
      promptTemplate: template,
      promptTemplateId,
      scenarioCount: CONFIG.scenarioCount,
      generateTwins: CONFIG.generateTwins,
      rolloutsPerScenario: CONFIG.rolloutsPerScenario,
      seed: Date.now(), // Different scenarios each time
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
  console.log(`   Avg Latency: ${run.aggregateMetrics.avgLatencyMs}ms`);
  console.log(`   Consistency: ${run.aggregateMetrics.avgConsistency}%`);

  if (run.aggregateMetrics.directionalAccuracy !== undefined) {
    console.log(`   Directional Accuracy: ${run.aggregateMetrics.directionalAccuracy}%`);
  }

  return run;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 Gemini Model Performance Analysis');
  console.log('='.repeat(70));
  console.log(`\nConfiguration:`);
  console.log(`  - Scenarios: ${CONFIG.scenarioCount} (${CONFIG.generateTwins ? 'with twins' : 'no twins'})`);
  console.log(`  - Rollouts per scenario: ${CONFIG.rolloutsPerScenario}`);
  console.log(`  - Models: ${GEMINI_MODELS.map(m => m.name).join(', ')}`);
  console.log(`  - Prompts: ${PROMPT_TEMPLATES.join(', ')}`);

  const results = [];

  // Test each model with each prompt template
  for (const model of GEMINI_MODELS) {
    for (const promptTemplateId of PROMPT_TEMPLATES) {
      try {
        const run = await runBenchmark(model, promptTemplateId);
        results.push({
          model: model.name,
          modelId: model.id,
          promptTemplate: promptTemplateId,
          runId: run.id,
          metrics: run.aggregateMetrics,
        });

        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error running ${model.name} with ${promptTemplateId}:`, error.message);
        results.push({
          model: model.name,
          modelId: model.id,
          promptTemplate: promptTemplateId,
          error: error.message,
        });
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  console.log('\n┌─────────────────────┬──────────────────┬─────────┬────────┬───────────┐');
  console.log('│ Model               │ Prompt           │ Hit%    │ RMSE   │ Consist%  │');
  console.log('├─────────────────────┼──────────────────┼─────────┼────────┼───────────┤');

  for (const result of results) {
    if (result.error) {
      console.log(`│ ${result.model.padEnd(19)} │ ${result.promptTemplate.padEnd(16)} │ ERROR                           │`);
    } else {
      const hit = result.metrics.hitRate.toFixed(1).padStart(5);
      const rmse = result.metrics.rmse.toFixed(2).padStart(4);
      const consist = result.metrics.avgConsistency?.toFixed(1).padStart(5) || 'N/A';
      console.log(`│ ${result.model.padEnd(19)} │ ${result.promptTemplate.padEnd(16)} │ ${hit}%  │ ${rmse}   │ ${consist}%    │`);
    }
  }

  console.log('└─────────────────────┴──────────────────┴─────────┴────────┴───────────┘');

  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(__dirname, 'knowledge', `gemini-analysis-${timestamp}.json`);

  // Ensure knowledge directory exists
  const knowledgeDir = path.join(__dirname, 'knowledge');
  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    models: GEMINI_MODELS,
    promptTemplates: PROMPT_TEMPLATES,
    results,
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${outputFile}`);
  console.log(`\n🔍 To analyze individual runs, check the run IDs above`);
  console.log(`   Run data stored in: data/runs/`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
