#!/usr/bin/env node

/**
 * Generate a new test set with fixed scenarios
 *
 * Usage:
 *   node scripts/generate-testset.js --name baseline-v1 --size 10 --twins --seed 42424242
 *
 * Options:
 *   --name         Test set name (required)
 *   --description  Description of the test set
 *   --domain       Domain ID (default: real-estate-yield)
 *   --size         Number of base scenarios (default: 10)
 *   --twins        Generate twin pairs (default: true)
 *   --seed         Random seed for reproducibility (default: random)
 *   --narrative    Use LLM-based narratives (default: true)
 *   --model        Model for narrative generation (default: openai/gpt-4o-mini)
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
const hasFlag = (name) => args.includes(`--${name}`);

const config = {
  name: getArg('name', null),
  description: getArg('description', ''),
  domainId: getArg('domain', 'real-estate-yield'),
  size: parseInt(getArg('size', '10')),
  generateTwins: hasFlag('twins') || !hasFlag('no-twins'),
  seed: parseInt(getArg('seed', Date.now().toString())),
  useNarrativeDescriptions: hasFlag('narrative') || !hasFlag('no-narrative'),
  narrativeModel: getArg('model', 'openai/gpt-4o-mini'),
};

if (!config.name) {
  console.error('Error: --name is required');
  console.log('\nUsage: node scripts/generate-testset.js --name baseline-v1 [options]');
  process.exit(1);
}

async function generateTestSet() {
  console.log('Generating test set with configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');

  const apiUrl = 'http://localhost:3000/api/test-sets';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const testSet = await response.json();

    console.log('✅ Test set created successfully!');
    console.log('');
    console.log(`Name: ${testSet.name}`);
    console.log(`Version: ${testSet.version}`);
    console.log(`Scenarios: ${testSet.scenarioCount}`);
    console.log(`Domain: ${testSet.domainId}`);
    console.log(`Twins: ${testSet.generateTwins ? 'Yes' : 'No'}`);
    console.log(`Narratives: ${testSet.useNarrativeDescriptions ? `Yes (${testSet.narrativeModel})` : 'No'}`);
    console.log(`Seed: ${testSet.seed || 'N/A'}`);
    console.log('');
    console.log(`Saved to: data/test-sets/${testSet.name}.json`);
    console.log('');
    console.log('Next steps:');
    console.log(`  node scripts/run-testset.js --testset ${testSet.name} --model <model> --prompt <template>`);

  } catch (error) {
    console.error('❌ Failed to generate test set:', error.message);
    process.exit(1);
  }
}

generateTestSet();
