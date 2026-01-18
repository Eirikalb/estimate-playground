#!/usr/bin/env node

/**
 * Analyze if different runs shared any scenarios
 * This helps determine if performance differences are prompt-caused or scenario-caused
 */

const fs = require('fs');
const path = require('path');

const runs = [
  { id: '8995522b-0b4b-4379-a231-0ea1a53e43f0', name: 'Gemini 3 Flash Current CoT', hitRate: 90.0 },
  { id: 'd589f77a-26a0-4f46-87a3-292961821836', name: 'Gemini 3 Flash Enhanced CoT', hitRate: 63.6 },
  { id: '0fda8d39-543e-4dbc-b3c5-6426eb87df33', name: 'GPT-4o Current CoT', hitRate: 63.6 },
  { id: 'c4c7b27e-4b2b-4037-9318-4b7bba347764', name: 'GPT-4o Enhanced CoT', hitRate: 45.5 },
];

console.log('='.repeat(70));
console.log('Scenario Overlap Analysis');
console.log('='.repeat(70));
console.log('\nQuestion: Did different runs use the same scenarios?');
console.log('If YES → Performance differences are prompt/model-caused');
console.log('If NO → Performance differences could be scenario-difficulty-caused\n');

// Load all runs
const runData = runs.map(r => {
  const filepath = path.join(__dirname, '..', 'data', 'runs', `${r.id}.json`);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  // Extract scenario characteristics (anchor + deltas)
  const scenarioFingerprints = data.scenarios.map(s => {
    const deltas = [...s.appliedDeltas].sort().join(',');
    return {
      fingerprint: `${s.anchor}|${deltas}`,
      groundTruth: s.groundTruth.value,
      anchor: s.anchor,
      deltas: s.appliedDeltas,
    };
  });

  return {
    ...r,
    scenarioCount: data.scenarios.length,
    fingerprints: scenarioFingerprints,
  };
});

// Check for overlaps
console.log('📊 SCENARIO FINGERPRINTS BY RUN');
console.log('─'.repeat(70));

for (const run of runData) {
  console.log(`\n${run.name} (${run.hitRate}% hit rate)`);
  console.log(`  Scenarios: ${run.scenarioCount}`);
  console.log(`  Fingerprints (first 3):`);
  run.fingerprints.slice(0, 3).forEach(fp => {
    console.log(`    - ${fp.fingerprint} (GT: ${fp.groundTruth}%)`);
  });
}

// Find exact matches
console.log('\n\n🔍 EXACT SCENARIO MATCHES');
console.log('─'.repeat(70));

let foundAnyMatch = false;

for (let i = 0; i < runData.length; i++) {
  for (let j = i + 1; j < runData.length; j++) {
    const run1 = runData[i];
    const run2 = runData[j];

    const fp1Set = new Set(run1.fingerprints.map(f => f.fingerprint));
    const fp2Set = new Set(run2.fingerprints.map(f => f.fingerprint));

    const matches = run1.fingerprints.filter(f => fp2Set.has(f.fingerprint));

    if (matches.length > 0) {
      foundAnyMatch = true;
      console.log(`\n${run1.name} ↔ ${run2.name}`);
      console.log(`  Matching scenarios: ${matches.length}/${run1.scenarioCount}`);
      console.log(`  Overlap: ${(matches.length / run1.scenarioCount * 100).toFixed(1)}%`);

      if (matches.length > 0 && matches.length < 5) {
        console.log(`  Matched:`);
        matches.forEach(m => console.log(`    - ${m.fingerprint}`));
      }
    }
  }
}

if (!foundAnyMatch) {
  console.log('\n❌ NO OVERLAPPING SCENARIOS FOUND');
  console.log('\nThis means:');
  console.log('  - Each run used completely different scenarios');
  console.log('  - Performance differences could be due to scenario difficulty');
  console.log('  - We CANNOT conclusively attribute differences to prompt/model alone');
  console.log('\n⚠️  WARNING: Our analysis conclusions may be invalid!');
  console.log('\nTo fix this:');
  console.log('  1. Create a test set with fixed scenarios');
  console.log('  2. Re-run all models/prompts on the SAME scenarios');
  console.log('  3. Then compare performance fairly');
}

// Analyze scenario difficulty distribution
console.log('\n\n📈 SCENARIO DIFFICULTY ANALYSIS');
console.log('─'.repeat(70));

for (const run of runData) {
  const anchors = {};
  const deltaCount = [];

  run.fingerprints.forEach(fp => {
    anchors[fp.anchor] = (anchors[fp.anchor] || 0) + 1;
    deltaCount.push(fp.deltas.length);
  });

  const avgDeltas = (deltaCount.reduce((a,b) => a+b, 0) / deltaCount.length).toFixed(1);
  const maxDeltas = Math.max(...deltaCount);

  console.log(`\n${run.name}`);
  console.log(`  Anchor distribution: ${JSON.stringify(anchors)}`);
  console.log(`  Avg deltas per scenario: ${avgDeltas}`);
  console.log(`  Max deltas: ${maxDeltas}`);
  console.log(`  Complexity: ${maxDeltas >= 4 ? 'HIGH' : maxDeltas >= 3 ? 'MEDIUM' : 'LOW'}`);
}

console.log('\n\n🎯 CONCLUSION');
console.log('─'.repeat(70));

if (foundAnyMatch) {
  console.log('✅ Some scenarios overlap - we can partially validate our conclusions');
} else {
  console.log('❌ NO scenario overlap - conclusions about prompt effectiveness are UNVERIFIED');
  console.log('\nNEXT STEPS:');
  console.log('  1. ✅ Created baseline-v1 test set (done)');
  console.log('  2. ⏳ Re-run Gemini 3 Flash Enhanced on baseline-v1');
  console.log('  3. ⏳ Re-run all GPT configs on baseline-v1');
  console.log('  4. ⏳ Compare results on SAME scenarios');
}
