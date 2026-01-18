#!/usr/bin/env node

/**
 * Run a test set with a specific model and prompt configuration
 *
 * Usage:
 *   node scripts/run-testset.js --testset baseline-v1 --model google/gemini-3-flash-preview --prompt chain-of-thought
 *
 * Options:
 *   --testset      Test set name (required)
 *   --model        Model to test (required)
 *   --prompt       Prompt template ID (required)
 *   --rollouts     Number of rollouts per scenario (default: 3)
 */

const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

const config = {
  testSetName: getArg('testset', null),
  model: getArg('model', null),
  promptTemplateId: getArg('prompt', null),
  rolloutsPerScenario: parseInt(getArg('rollouts', '3')),
};

if (!config.testSetName || !config.model || !config.promptTemplateId) {
  console.error('Error: --testset, --model, and --prompt are required');
  console.log('\nUsage: node scripts/run-testset.js --testset baseline-v1 --model <model> --prompt <template>');
  console.log('\nExamples:');
  console.log('  node scripts/run-testset.js --testset baseline-v1 --model google/gemini-3-flash-preview --prompt chain-of-thought');
  console.log('  node scripts/run-testset.js --testset baseline-v1 --model openai/gpt-4o --prompt chain-of-thought-enhanced --rollouts 5');
  process.exit(1);
}

async function runTestSet() {
  console.log('Running test set with configuration:');
  console.log(`  Test Set: ${config.testSetName}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Prompt: ${config.promptTemplateId}`);
  console.log(`  Rollouts: ${config.rolloutsPerScenario}`);
  console.log('');

  const apiUrl = 'http://localhost:3000/api/runs';

  try {
    console.log('Starting run...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const run = await response.json();

    console.log('✅ Run completed!');
    console.log('');
    console.log(`Run ID: ${run.id}`);
    console.log(`Status: ${run.status}`);
    console.log(`Scenarios: ${run.scenarios.length}`);
    console.log('');
    console.log('Results:');
    console.log(`  Hit Rate: ${run.aggregateMetrics?.hitRate?.toFixed(1)}%`);
    console.log(`  Mean Error: ${run.aggregateMetrics?.meanError?.toFixed(2)}%`);
    console.log(`  RMSE: ${run.aggregateMetrics?.rmse?.toFixed(2)}%`);
    console.log(`  Avg Latency: ${run.aggregateMetrics?.avgLatencyMs?.toFixed(0)}ms`);
    if (run.aggregateMetrics?.avgConsistency) {
      console.log(`  Avg Consistency: ${run.aggregateMetrics.avgConsistency.toFixed(1)}%`);
    }
    console.log('');
    console.log(`Saved to: data/runs/${run.id}.json`);
    console.log(`View at: http://localhost:3000/runs/${run.id}`);

  } catch (error) {
    console.error('❌ Failed to run test set:', error.message);
    process.exit(1);
  }
}

runTestSet();
