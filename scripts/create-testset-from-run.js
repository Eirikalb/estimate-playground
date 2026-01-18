#!/usr/bin/env node

/**
 * Convert an existing run into a reusable test set
 *
 * Usage:
 *   node scripts/create-testset-from-run.js --run <run-id> --name baseline-v1
 *
 * Options:
 *   --run          Source run ID (required)
 *   --name         Test set name (required)
 *   --description  Description override (optional)
 *   --version      Version number (default: 1.0.0)
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

const runId = getArg('run', null);
const testSetName = getArg('name', null);
const description = getArg('description', null);
const version = getArg('version', '1.0.0');

if (!runId || !testSetName) {
  console.error('Error: Both --run and --name are required');
  console.log('\nUsage: node scripts/create-testset-from-run.js --run <run-id> --name baseline-v1');
  process.exit(1);
}

async function createTestSetFromRun() {
  const runPath = path.join(process.cwd(), 'data', 'runs', `${runId}.json`);
  const testSetsDir = path.join(process.cwd(), 'data', 'test-sets');
  const testSetPath = path.join(testSetsDir, `${testSetName}.json`);

  try {
    // Load the source run
    console.log(`Loading run: ${runId}`);
    const runData = JSON.parse(await fs.readFile(runPath, 'utf-8'));

    // Create test set
    const testSet = {
      name: testSetName,
      version: version,
      description: description ||
        `Test set extracted from run ${runId.slice(0, 8)}. ` +
        `${runData.scenarios.length} scenarios using ${runData.model} with ${runData.promptStrategy} prompt. ` +
        `Hit rate: ${runData.aggregateMetrics?.hitRate?.toFixed(1)}%`,
      created: new Date().toISOString(),
      domainId: runData.domainId,
      scenarioCount: runData.scenarios.length,
      seed: runData.seed || null,
      generateTwins: runData.scenarios.some(s => s.twinId != null),
      useNarrativeDescriptions: runData.useNarrativeDescriptions || false,
      narrativeModel: runData.narrativeModel || null,
      sourceRunId: runId,
      scenarios: runData.scenarios,
      changelog: [
        `v${version} (${new Date().toISOString().split('T')[0]}): Initial version from run ${runId.slice(0, 8)}`,
      ],
    };

    // Ensure test-sets directory exists
    await fs.mkdir(testSetsDir, { recursive: true });

    // Save test set
    await fs.writeFile(testSetPath, JSON.stringify(testSet, null, 2));

    console.log('✅ Test set created successfully!');
    console.log('');
    console.log(`Name: ${testSet.name}`);
    console.log(`Version: ${testSet.version}`);
    console.log(`Description: ${testSet.description}`);
    console.log(`Scenarios: ${testSet.scenarioCount}`);
    console.log(`Source run: ${runId}`);
    console.log('');
    console.log(`Saved to: data/test-sets/${testSetName}.json`);
    console.log('');
    console.log('Next steps:');
    console.log(`  node scripts/run-testset.js --testset ${testSetName} --model <model> --prompt <template>`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Run not found: ${runId}`);
      console.log('\nAvailable runs:');
      const runsDir = path.join(process.cwd(), 'data', 'runs');
      try {
        const files = await fs.readdir(runsDir);
        files.filter(f => f.endsWith('.json'))
          .slice(0, 10)
          .forEach(f => console.log(`  ${f.replace('.json', '')}`));
      } catch {
        console.log('  (No runs found)');
      }
    } else {
      console.error('❌ Failed to create test set:', error.message);
    }
    process.exit(1);
  }
}

createTestSetFromRun();
