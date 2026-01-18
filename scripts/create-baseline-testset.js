#!/usr/bin/env node

/**
 * Create a baseline test set from the Gemini 3 Flash 90% run
 * This allows us to reuse the SAME scenarios for fair comparison
 */

const fs = require('fs');
const path = require('path');

// Use Gemini 3 Flash baseline run
const BASELINE_RUN_ID = '8995522b-0b4b-4379-a231-0ea1a53e43f0';

console.log('Creating baseline test set from Gemini 3 Flash run...');
console.log(`Source: ${BASELINE_RUN_ID}\n`);

const runPath = path.join(__dirname, '..', 'data', 'runs', `${BASELINE_RUN_ID}.json`);
const runData = JSON.parse(fs.readFileSync(runPath, 'utf8'));

const testSet = {
  name: 'baseline-v1',
  version: '1.0.0',
  description: 'Baseline test set from Gemini 3 Flash 90% hit rate run (2026-01-18). 11 scenarios covering office, retail, and logistics properties across Norway.',
  created: new Date().toISOString(),
  domainId: runData.domainId,
  scenarioCount: runData.scenarios.length,
  seed: null, // Original seed not recorded
  generateTwins: runData.scenarios.some(s => s.twinId),
  useNarrativeDescriptions: runData.useNarrativeDescriptions,
  narrativeModel: runData.narrativeModel,
  sourceRunId: BASELINE_RUN_ID,
  scenarios: runData.scenarios,
};

// Create test-sets directory
const testSetsDir = path.join(__dirname, '..', 'data', 'test-sets');
fs.mkdirSync(testSetsDir, { recursive: true });

// Save test set
const testSetPath = path.join(testSetsDir, 'baseline-v1.json');
fs.writeFileSync(testSetPath, JSON.stringify(testSet, null, 2));

console.log('✅ Created baseline-v1 test set');
console.log(`   File: ${testSetPath}`);
console.log(`   Scenarios: ${testSet.scenarioCount}`);
console.log(`   Source run: ${BASELINE_RUN_ID}`);
console.log(`   Performance on source: 90% hit rate, 0.24 RMSE`);
console.log('\nYou can now run this test set with different models/prompts:');
console.log('  node scripts/run-testset.js baseline-v1 <model> <prompt>');
