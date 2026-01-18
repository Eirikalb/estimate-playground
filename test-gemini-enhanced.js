#!/usr/bin/env node

/**
 * Test Gemini 3 Flash with enhanced chain-of-thought prompt
 * to see if explicit arithmetic improves its already strong performance
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 Gemini 3 Flash: Enhanced Prompt Test');
  console.log('='.repeat(70));
  console.log('\nHypothesis: Enhanced prompt may push Gemini from 90% → 95%+ hit rate');
  console.log('Baseline: 90% hit rate, 0.24 RMSE with current CoT\n');

  // Get enhanced prompt
  const templateRes = await fetch(`${API_BASE}/templates?name=chain-of-thought-enhanced`);
  const { template: enhancedPrompt } = await templateRes.json();

  // Run test with same seed as GPT tests for comparison
  const response = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domainId: 'real-estate-yield',
      model: 'google/gemini-3-flash-preview',
      promptTemplate: enhancedPrompt,
      promptTemplateId: 'chain-of-thought-enhanced',
      scenarioCount: 6,
      generateTwins: true,
      rolloutsPerScenario: 3,
      seed: 42424242, // Same seed as GPT tests
      useNarrativeDescriptions: true,
      narrativeModel: 'openai/gpt-4o-mini',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${await response.text()}`);
  }

  const run = await response.json();

  console.log('📊 RESULTS');
  console.log('─'.repeat(70));
  console.log(`Run ID: ${run.id}`);
  console.log(`Hit Rate: ${run.aggregateMetrics.hitRate}%`);
  console.log(`RMSE: ${run.aggregateMetrics.rmse}`);
  console.log(`Mean Error: ${run.aggregateMetrics.meanError}`);
  console.log(`Consistency: ${run.aggregateMetrics.avgConsistency}%`);
  console.log(`Directional Accuracy: ${run.aggregateMetrics.directionalAccuracy}%`);
  console.log(`Avg Latency: ${run.aggregateMetrics.avgLatencyMs}ms`);

  // Compare to baseline
  const baselineHitRate = 90.0;
  const baselineRMSE = 0.24;
  const hitDelta = run.aggregateMetrics.hitRate - baselineHitRate;
  const rmseDelta = baselineRMSE - run.aggregateMetrics.rmse;

  console.log('\n📈 COMPARISON TO BASELINE (Current CoT)');
  console.log('─'.repeat(70));
  console.log(`Hit Rate: ${baselineHitRate}% → ${run.aggregateMetrics.hitRate}% (${hitDelta > 0 ? '+' : ''}${hitDelta.toFixed(1)}pp)`);
  console.log(`RMSE: ${baselineRMSE} → ${run.aggregateMetrics.rmse} (${rmseDelta > 0 ? '-' : '+'}${Math.abs(rmseDelta).toFixed(2)})`);

  // Verdict
  console.log('\n🎯 VERDICT');
  console.log('─'.repeat(70));
  if (hitDelta > 0) {
    console.log(`✅ Enhanced prompt IMPROVED Gemini 3 Flash (+${hitDelta.toFixed(1)}pp)`);
    console.log('   Recommendation: Consider switching to enhanced prompt for production');
  } else if (hitDelta === 0) {
    console.log('➖ Enhanced prompt had NO EFFECT on hit rate');
    console.log(`   RMSE ${rmseDelta > 0 ? 'improved' : 'worsened'} by ${Math.abs(rmseDelta).toFixed(2)}`);
    console.log('   Recommendation: Stick with current CoT (simpler is better)');
  } else {
    console.log(`❌ Enhanced prompt DEGRADED Gemini 3 Flash (${hitDelta.toFixed(1)}pp)`);
    console.log('   Recommendation: Keep current CoT prompt');
  }

  console.log(`\n💾 Run data: data/runs/${run.id}.json`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
