# Test Set Specification

## Overview

Test sets allow you to run reproducible benchmarks across multiple models and prompts using **fixed scenarios**. This ensures fair comparison by eliminating scenario randomness.

---

## Why Test Sets?

**Problem:** Each run generates random scenarios, making it hard to compare:
- Different scenarios = different difficulty levels
- Can't isolate model/prompt performance from scenario variance
- Hard to debug specific failure cases

**Solution:** Fixed test sets with versioned scenarios
- Same scenarios across all tests
- Reproducible results
- Fair model/prompt comparison
- Easy regression testing

---

## Test Set Format

Test sets are stored in `data/test-sets/` as JSON files.

### Schema

```json
{
  "name": "standard-benchmark-v1",
  "version": "1.0.0",
  "description": "Standard 20-scenario test set covering all property types",
  "created": "2026-01-18T22:00:00Z",
  "domainId": "real-estate-yield",
  "scenarioCount": 20,
  "seed": 42424242,
  "generateTwins": true,
  "useNarrativeDescriptions": true,
  "narrativeModel": "openai/gpt-4o-mini",
  "scenarios": [
    {
      "id": "scenario-001",
      "anchor": "office_oslo_centre",
      "appliedDeltas": ["single_tenant_sme", "government_tenant", "short_lease"],
      "distractors": [],
      "contextDescription": "...",
      "groundTruth": {
        "value": 6.23,
        "tolerance": 0.35,
        "calculation": "Base: 5.625%..."
      },
      "twinId": "scenario-002",
      "twinDeltaChanged": "removed: single_tenant_sme"
    },
    ...
  ]
}
```

### Fields

- **name**: Unique identifier for this test set
- **version**: Semantic version (allows updates)
- **description**: What this test set covers
- **created**: ISO timestamp of creation
- **domainId**: Domain this test set applies to
- **scenarioCount**: Total number of scenarios (including twins)
- **seed**: Seed used to generate scenarios (for reference)
- **generateTwins**: Whether twin pairs are included
- **useNarrativeDescriptions**: Whether narratives were generated
- **narrativeModel**: Model used for narrative generation
- **scenarios**: Array of complete scenario objects

---

## Creating Test Sets

### Option 1: From Existing Run

Convert a successful run into a reusable test set:

```javascript
// create-test-set-from-run.js
const runId = '8995522b-0b4b-4379-a231-0ea1a53e43f0'; // Gemini 3 Flash baseline
const runData = JSON.parse(fs.readFileSync(`data/runs/${runId}.json`));

const testSet = {
  name: 'gemini-baseline-scenarios',
  version: '1.0.0',
  description: 'Scenarios from Gemini 3 Flash 90% hit rate baseline run',
  created: new Date().toISOString(),
  domainId: runData.domainId,
  scenarioCount: runData.scenarios.length,
  seed: runData.seed || null,
  generateTwins: runData.scenarios.some(s => s.twinId),
  useNarrativeDescriptions: runData.useNarrativeDescriptions,
  narrativeModel: runData.narrativeModel,
  scenarios: runData.scenarios,
};

fs.writeFileSync(
  'data/test-sets/gemini-baseline-scenarios-v1.json',
  JSON.stringify(testSet, null, 2)
);
```

### Option 2: Generate New Test Set

Create a new test set with specific parameters:

```javascript
// generate-test-set.js
const response = await fetch('http://localhost:3000/api/test-sets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'comprehensive-v1',
    description: 'Comprehensive 30-scenario test covering all property types',
    domainId: 'real-estate-yield',
    scenarioCount: 15, // Will create 30 with twins
    generateTwins: true,
    seed: 123456,
    useNarrativeDescriptions: true,
    narrativeModel: 'openai/gpt-4o-mini',
  }),
});

const testSet = await response.json();
// Automatically saved to data/test-sets/
```

---

## Running Test Sets

### Basic Usage

```javascript
// run-test-set.js
const testSetName = 'gemini-baseline-scenarios-v1';
const model = 'google/gemini-3-flash-preview';
const promptTemplate = 'chain-of-thought';

const response = await fetch('http://localhost:3000/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    testSetName, // Use existing test set
    model,
    promptTemplateId: promptTemplate,
    rolloutsPerScenario: 3,
  }),
});
```

### Batch Testing Multiple Models/Prompts

```javascript
// batch-test.js
const testSetName = 'gemini-baseline-scenarios-v1';
const configs = [
  { model: 'google/gemini-3-flash-preview', prompt: 'chain-of-thought' },
  { model: 'google/gemini-3-flash-preview', prompt: 'chain-of-thought-enhanced' },
  { model: 'openai/gpt-4o', prompt: 'chain-of-thought' },
  { model: 'openai/gpt-4o-mini', prompt: 'chain-of-thought' },
];

for (const config of configs) {
  const run = await runTestSet(testSetName, config.model, config.prompt);
  console.log(`${config.model} + ${config.prompt}: ${run.aggregateMetrics.hitRate}%`);
}
```

---

## Test Set Management

### Directory Structure

```
data/
├── test-sets/
│   ├── gemini-baseline-scenarios-v1.json
│   ├── comprehensive-v1.json
│   ├── regression-suite-v1.json
│   └── edge-cases-v1.json
└── runs/
    └── <run-id>.json (includes testSetName if applicable)
```

### Versioning

When updating a test set:
1. Increment version (e.g., v1.0.0 → v1.1.0 or v2.0.0)
2. Update `description` with changelog
3. Keep old version for backward compatibility

**Example:**
```
gemini-baseline-scenarios-v1.0.0.json  (original)
gemini-baseline-scenarios-v1.1.0.json  (added 5 more scenarios)
gemini-baseline-scenarios-v2.0.0.json  (regenerated narratives)
```

### Naming Conventions

- `{purpose}-{version}.json`
- Examples:
  - `baseline-v1.json` - Standard baseline test
  - `edge-cases-v1.json` - Difficult edge cases
  - `regression-v1.json` - Regression prevention suite
  - `quick-smoke-v1.json` - Fast 5-scenario smoke test

---

## Standard Test Sets

### 1. Baseline Test Set
**Name:** `baseline-v1`
**Size:** 11 scenarios (5 twins + 1 single)
**Purpose:** Quick comparison across models/prompts
**Use case:** Initial testing, rapid iteration

### 2. Comprehensive Test Set
**Name:** `comprehensive-v1`
**Size:** 30 scenarios (15 base + 15 twins)
**Purpose:** Full evaluation of model performance
**Use case:** Production validation, final decision-making

### 3. Regression Test Set
**Name:** `regression-v1`
**Size:** Historical failure cases
**Purpose:** Prevent regressions on known failure modes
**Use case:** CI/CD, prompt updates

### 4. Smoke Test Set
**Name:** `smoke-v1`
**Size:** 5 scenarios
**Purpose:** Quick validation that model/prompt works
**Use case:** Pre-deployment sanity check

---

## API Endpoints

### Create Test Set
```
POST /api/test-sets
Body: {
  name, description, domainId, scenarioCount,
  generateTwins, seed, useNarrativeDescriptions, narrativeModel
}
Returns: Test set object
```

### List Test Sets
```
GET /api/test-sets
Returns: Array of test set metadata (without full scenarios)
```

### Get Test Set
```
GET /api/test-sets/:name
Returns: Full test set with scenarios
```

### Run with Test Set
```
POST /api/runs
Body: {
  testSetName,  // Uses scenarios from test set
  model,
  promptTemplateId,
  rolloutsPerScenario
}
Returns: Run object (includes testSetName reference)
```

---

## Best Practices

### 1. Use Fixed Seeds
Always use fixed seeds when generating test sets to ensure reproducibility.

### 2. Document Changes
Include a changelog in the description when updating test sets:
```json
{
  "description": "v1.1.0: Added 5 logistics scenarios to improve coverage. Original 25 scenarios unchanged.",
  "changelog": [
    "v1.1.0 (2026-01-19): Added logistics scenarios",
    "v1.0.0 (2026-01-18): Initial release"
  ]
}
```

### 3. Version Control Test Sets
Commit test sets to git for team collaboration and history tracking.

### 4. Separate Fast and Slow Tests
- **Smoke tests** (5-10 scenarios): Quick validation
- **Full tests** (20-30 scenarios): Comprehensive evaluation

### 5. Tag Runs with Test Set Name
When running with a test set, the run should record `testSetName` for traceability:
```json
{
  "id": "abc123",
  "testSetName": "baseline-v1",
  "testSetVersion": "1.0.0",
  ...
}
```

---

## Example Workflow

### Step 1: Create Baseline Test Set
```bash
# Generate scenarios once
node scripts/generate-test-set.js \
  --name baseline-v1 \
  --size 10 \
  --twins \
  --seed 42424242
```

### Step 2: Test Multiple Configurations
```bash
# Run same scenarios across different configs
node scripts/batch-test.js \
  --test-set baseline-v1 \
  --models gemini-3-flash,gpt-4o,gpt-4o-mini \
  --prompts chain-of-thought,chain-of-thought-enhanced
```

### Step 3: Compare Results
```bash
# Generate comparison report
node scripts/compare-runs.js \
  --test-set baseline-v1 \
  --output reports/baseline-comparison-2026-01-18.md
```

---

## Implementation Checklist

- [ ] Create `data/test-sets/` directory
- [ ] Add test set schema validation
- [ ] Implement `POST /api/test-sets` endpoint
- [ ] Implement `GET /api/test-sets` endpoint
- [ ] Implement `GET /api/test-sets/:name` endpoint
- [ ] Update `POST /api/runs` to accept `testSetName`
- [ ] Add `testSetName` field to run objects
- [ ] Create `scripts/generate-test-set.js`
- [ ] Create `scripts/create-test-set-from-run.js`
- [ ] Create `scripts/batch-test.js`
- [ ] Create `scripts/compare-runs.js`
- [ ] Add test set documentation to README
- [ ] Create initial baseline test set from Gemini run

---

## Benefits

✅ **Reproducibility** - Same scenarios every time
✅ **Fair comparison** - Apples to apples
✅ **Regression prevention** - Track performance over time
✅ **Debugging** - Isolate model vs scenario issues
✅ **Team collaboration** - Shared test sets
✅ **CI/CD integration** - Automated testing
✅ **Historical tracking** - Version-controlled benchmarks

---

## Example: Converting Gemini Baseline Run

```javascript
#!/usr/bin/env node
// scripts/create-baseline-test-set.js

const fs = require('fs');

// Use the Gemini 3 Flash 90% hit rate run as baseline
const BASELINE_RUN_ID = '8995522b-0b4b-4379-a231-0ea1a53e43f0';

const runData = JSON.parse(
  fs.readFileSync(`data/runs/${BASELINE_RUN_ID}.json`)
);

const testSet = {
  name: 'baseline-v1',
  version: '1.0.0',
  description: 'Standard baseline test set from Gemini 3 Flash 90% hit rate run. 11 scenarios covering office, retail, and logistics properties across Norway.',
  created: new Date().toISOString(),
  domainId: runData.domainId,
  scenarioCount: runData.scenarios.length,
  seed: null, // Original run seed unknown
  generateTwins: true,
  useNarrativeDescriptions: runData.useNarrativeDescriptions,
  narrativeModel: runData.narrativeModel,
  sourceRunId: BASELINE_RUN_ID,
  scenarios: runData.scenarios,
};

fs.mkdirSync('data/test-sets', { recursive: true });
fs.writeFileSync(
  'data/test-sets/baseline-v1.json',
  JSON.stringify(testSet, null, 2)
);

console.log('✅ Created baseline-v1 test set');
console.log(`   Scenarios: ${testSet.scenarioCount}`);
console.log(`   Source run: ${BASELINE_RUN_ID}`);
```

Usage:
```bash
node scripts/create-baseline-test-set.js
node scripts/batch-test.js --test-set baseline-v1
```
