#!/usr/bin/env node

/**
 * Run a test set across multiple model and prompt configurations
 *
 * Usage:
 *   node scripts/batch-test.js --testset baseline-v1 --config batch-configs.json
 *   node scripts/batch-test.js --testset baseline-v1 --models gemini,gpt4 --prompts cot,enhanced
 *
 * Options:
 *   --testset      Test set name (required)
 *   --config       JSON file with configurations (optional)
 *   --models       Comma-separated model shortcuts (optional)
 *   --prompts      Comma-separated prompt template IDs (optional)
 *   --rollouts     Number of rollouts per scenario (default: 3)
 *   --delay        Delay between runs in ms (default: 1000)
 */

const fs = require('fs').promises;
const path = require('path');

// Model shortcuts
const MODEL_SHORTCUTS = {
  'gemini': 'google/gemini-3-flash-preview',
  'gemini-flash': 'google/gemini-3-flash-preview',
  'gpt4': 'openai/gpt-4o',
  'gpt4o': 'openai/gpt-4o',
  'gpt4-mini': 'openai/gpt-4o-mini',
  'gpt4o-mini': 'openai/gpt-4o-mini',
};

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

const testSetName = getArg('testset', null);
const configFile = getArg('config', null);
const modelsArg = getArg('models', null);
const promptsArg = getArg('prompts', null);
const rolloutsPerScenario = parseInt(getArg('rollouts', '3'));
const delayMs = parseInt(getArg('delay', '1000'));

if (!testSetName) {
  console.error('Error: --testset is required');
  console.log('\nUsage: node scripts/batch-test.js --testset baseline-v1 [options]');
  process.exit(1);
}

async function loadConfigurations() {
  // If config file specified, load from file
  if (configFile) {
    const configPath = path.join(process.cwd(), configFile);
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  // If models and prompts specified, generate combinations
  if (modelsArg && promptsArg) {
    const models = modelsArg.split(',').map(m => MODEL_SHORTCUTS[m.trim()] || m.trim());
    const prompts = promptsArg.split(',').map(p => p.trim());

    const configs = [];
    for (const model of models) {
      for (const prompt of prompts) {
        configs.push({ model, promptTemplateId: prompt });
      }
    }
    return configs;
  }

  // Default configurations
  console.log('No configurations specified, using defaults...');
  return [
    { model: 'google/gemini-3-flash-preview', promptTemplateId: 'chain-of-thought' },
    { model: 'openai/gpt-4o-mini', promptTemplateId: 'chain-of-thought' },
  ];
}

async function runBatchTest() {
  console.log(`Running batch test on test set: ${testSetName}`);
  console.log('');

  const apiUrl = 'http://localhost:3000/api/runs';

  try {
    const configurations = await loadConfigurations();
    console.log(`Testing ${configurations.length} configurations:`);
    configurations.forEach((config, i) => {
      console.log(`  ${i + 1}. ${config.model} + ${config.promptTemplateId}`);
    });
    console.log('');

    const results = [];

    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      const configLabel = `${config.model.split('/').pop()} + ${config.promptTemplateId}`;

      console.log(`[${i + 1}/${configurations.length}] Running: ${configLabel}`);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testSetName,
            ...config,
            rolloutsPerScenario,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        const run = await response.json();

        results.push({
          config: configLabel,
          runId: run.id,
          hitRate: run.aggregateMetrics?.hitRate,
          meanError: run.aggregateMetrics?.meanError,
          rmse: run.aggregateMetrics?.rmse,
          avgLatencyMs: run.aggregateMetrics?.avgLatencyMs,
          avgConsistency: run.aggregateMetrics?.avgConsistency,
        });

        console.log(`  ✅ Hit Rate: ${run.aggregateMetrics?.hitRate?.toFixed(1)}% | RMSE: ${run.aggregateMetrics?.rmse?.toFixed(2)}% | Run: ${run.id}`);

      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        results.push({
          config: configLabel,
          error: error.message,
        });
      }

      // Delay between runs to avoid rate limiting
      if (i < configurations.length - 1) {
        console.log(`  Waiting ${delayMs}ms before next run...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      console.log('');
    }

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('BATCH TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const successful = results.filter(r => !r.error);
    if (successful.length > 0) {
      // Sort by hit rate descending
      successful.sort((a, b) => (b.hitRate || 0) - (a.hitRate || 0));

      console.log('Configuration                                     Hit Rate   RMSE    Latency  Consistency');
      console.log('────────────────────────────────────────────────  ─────────  ──────  ───────  ───────────');
      successful.forEach(r => {
        const config = r.config.padEnd(48);
        const hitRate = `${r.hitRate?.toFixed(1)}%`.padStart(9);
        const rmse = `${r.rmse?.toFixed(2)}%`.padStart(6);
        const latency = `${r.avgLatencyMs?.toFixed(0)}ms`.padStart(7);
        const consistency = r.avgConsistency ? `${r.avgConsistency.toFixed(1)}%`.padStart(11) : '     -      ';
        console.log(`${config}  ${hitRate}  ${rmse}  ${latency}  ${consistency}`);
      });
      console.log('');

      // Winner
      const winner = successful[0];
      console.log(`🏆 Best performer: ${winner.config}`);
      console.log(`   Hit Rate: ${winner.hitRate?.toFixed(1)}%, RMSE: ${winner.rmse?.toFixed(2)}%`);
    }

    const failed = results.filter(r => r.error);
    if (failed.length > 0) {
      console.log('');
      console.log('Failed runs:');
      failed.forEach(r => {
        console.log(`  ❌ ${r.config}: ${r.error}`);
      });
    }

    // Save results summary
    const summaryPath = path.join(
      process.cwd(),
      'data',
      `batch-test-${testSetName}-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
    console.log('');
    console.log(`Summary saved to: ${summaryPath}`);

  } catch (error) {
    console.error('❌ Batch test failed:', error.message);
    process.exit(1);
  }
}

runBatchTest();
