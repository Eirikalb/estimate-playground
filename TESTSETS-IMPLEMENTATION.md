# Test Sets Implementation Summary

## What Was Built

A complete testset system that enables reproducible, controlled testing of model and prompt configurations by using fixed scenarios instead of randomly generated ones.

## Core Problem Solved

**Before:** Each benchmark run generated random scenarios, making it impossible to know if performance differences came from better models/prompts or just easier/harder scenarios.

**After:** Generate scenarios once, save as versioned testsets, then run the same scenarios across all configurations for true apples-to-apples comparison.

## Implementation Details

### 1. Schema Extensions ([src/domains/schema.ts](src/domains/schema.ts))
- Added `TestSetSchema` with versioning, changelog, and metadata
- Extended `BenchmarkRunSchema` with `testSetName` and `testSetVersion` fields for traceability

### 2. Storage Layer ([src/lib/storage.ts](src/lib/storage.ts))
- `saveTestSet()` - Save testsets to `data/test-sets/`
- `loadTestSet()` - Load complete testset with scenarios
- `listTestSets()` - List testsets (metadata only, scenarios omitted for performance)
- `deleteTestSet()` - Remove testset

### 3. API Routes

#### [src/app/api/test-sets/route.ts](src/app/api/test-sets/route.ts)
- `POST /api/test-sets` - Create new testset (generates scenarios)
- `GET /api/test-sets` - List all testsets

#### [src/app/api/test-sets/[name]/route.ts](src/app/api/test-sets/[name]/route.ts)
- `GET /api/test-sets/:name` - Get specific testset with scenarios
- `DELETE /api/test-sets/:name` - Delete testset

#### [src/app/api/runs/route.ts](src/app/api/runs/route.ts) (Modified)
- Now accepts `testSetName` parameter
- If provided, loads scenarios from testset instead of generating new ones
- Tracks testset reference in run metadata

### 4. Command-Line Scripts

#### [scripts/create-testset-from-run.js](scripts/create-testset-from-run.js)
Convert existing successful run into reusable testset.

```bash
node scripts/create-testset-from-run.js --run <run-id> --name baseline-v1
```

#### [scripts/generate-testset.js](scripts/generate-testset.js)
Generate new testset with controlled parameters.

```bash
node scripts/generate-testset.js --name smoke-v1 --size 5 --twins --seed 42424242
```

#### [scripts/run-testset.js](scripts/run-testset.js)
Run testset with specific model/prompt configuration.

```bash
node scripts/run-testset.js --testset baseline-v1 --model gemini --prompt chain-of-thought
```

#### [scripts/batch-test.js](scripts/batch-test.js)
Run testset across multiple configurations and generate comparison report.

```bash
node scripts/batch-test.js --testset baseline-v1 --models gemini,gpt4 --prompts cot,enhanced
```

## File Structure

```
estimate-playground/
├── data/
│   ├── runs/                  # Benchmark run results
│   └── test-sets/             # Fixed scenario testsets (NEW)
│       ├── baseline-v1.json
│       ├── smoke-v1.json
│       └── comprehensive-v1.json
├── scripts/                   # Testing scripts (NEW)
│   ├── create-testset-from-run.js
│   ├── generate-testset.js
│   ├── run-testset.js
│   ├── batch-test.js
│   ├── example-workflow.sh
│   └── README.md
├── src/
│   ├── app/api/
│   │   ├── test-sets/         # Testset API routes (NEW)
│   │   │   ├── route.ts
│   │   │   └── [name]/route.ts
│   │   └── runs/route.ts      # Modified to support testsets
│   ├── domains/schema.ts      # Extended with TestSet schema
│   └── lib/storage.ts         # Extended with testset functions
├── TESTSETS.md                # Full specification
├── TESTSETS-IMPLEMENTATION.md # This file
└── AGENTS.md                  # Updated with testing approach
```

## Usage Workflow

### 1. Create Baseline Testset
```bash
# From existing high-performing run
node scripts/create-testset-from-run.js \
  --run 8995522b-0b4b-4379-a231-0ea1a53e43f0 \
  --name baseline-v1
```

### 2. Run Batch Tests
```bash
# Test all combinations
node scripts/batch-test.js \
  --testset baseline-v1 \
  --models gemini,gpt4,gpt4-mini \
  --prompts chain-of-thought,chain-of-thought-enhanced
```

### 3. Compare Results
- All runs use identical scenarios
- Performance differences = model/prompt quality
- Results saved to `data/batch-test-baseline-v1-<date>.json`

## Key Features

### Versioning
- Semantic versioning (v1.0.0, v1.1.0, v2.0.0)
- Changelog tracking
- Multiple versions can coexist

### Reproducibility
- Fixed seeds for scenario generation
- Complete scenario definitions stored
- Test set reference tracked in run metadata

### Flexibility
- Generate from scratch with controlled parameters
- Extract from successful existing runs
- Support for twins, narratives, distractors

### Performance
- Batch narrative generation (5 parallel)
- Metadata-only listing for fast UI
- Scenarios loaded only when needed

### Traceability
- Every run records which testset was used
- Testsets record source run if applicable
- Changelog documents testset evolution

## Testing Best Practices (from AGENTS.md)

**Fixed Testsets for Controlled Comparison:**
Generate scenarios once with controlled parameters (anchor types, deltas, distractors, seed), save as versioned testsets, then run the same testset across all model/prompt combinations. This eliminates random scenario difficulty as a variable.

**Batch Testing Workflow:**
1. Create baseline testset from successful run
2. Use `batch-test.js` to run across all configurations
3. Compare by hit rate and RMSE on identical scenarios
4. Version testsets when scenarios change
5. Maintain smoke (5-10) and comprehensive (20-30) testsets

## API Examples

### Create Testset
```bash
curl -X POST http://localhost:3000/api/test-sets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-test-v1",
    "size": 10,
    "generateTwins": true,
    "seed": 42424242,
    "useNarrativeDescriptions": true
  }'
```

### List Testsets
```bash
curl http://localhost:3000/api/test-sets
```

### Get Testset
```bash
curl http://localhost:3000/api/test-sets/baseline-v1
```

### Run with Testset
```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "testSetName": "baseline-v1",
    "model": "google/gemini-3-flash-preview",
    "promptTemplate": "...",
    "promptTemplateId": "chain-of-thought",
    "rolloutsPerScenario": 3
  }'
```

## Web UI Integration

### Playground Page ([/playground](http://localhost:3000/playground))

The playground now includes a **"Use Test Set"** toggle that lets you:
- Select from available test sets via dropdown
- See testset metadata (scenario count, version, description)
- Run benchmarks with fixed scenarios instead of generating new ones
- Compare models and prompts on identical scenarios

**Key Features:**
- Visual toggle to switch between testset and generated scenarios
- Dropdown showing all available testsets with metadata
- Info box showing testset details (scenario count, narratives)
- Automatic API call calculation
- Disabled/hidden controls when using testset (seed, narrative gen)

See [UI-TESTSETS.md](UI-TESTSETS.md) for detailed UI usage guide.

## Benefits

✅ **Fair Comparison** - Same scenarios across all tests
✅ **Reproducibility** - Fixed seeds and versioned testsets
✅ **Regression Prevention** - Track performance over time
✅ **Debugging** - Isolate model vs scenario issues
✅ **Team Collaboration** - Shared, version-controlled testsets
✅ **CI/CD Ready** - Automated testing with fixed scenarios
✅ **Historical Tracking** - Compare runs across time
✅ **Web UI Support** - Select and run testsets from the browser

## Next Steps

1. **Create your first testset:**
   ```bash
   node scripts/create-testset-from-run.js --run <recent-run-id> --name baseline-v1
   ```

2. **Run batch tests:**
   ```bash
   node scripts/batch-test.js --testset baseline-v1 --models gemini,gpt4 --prompts cot,enhanced
   ```

3. **Review results:**
   - Check batch test summary in `data/batch-test-*.json`
   - View individual runs at `http://localhost:3000`
   - Compare hit rates and RMSE across configurations

4. **Iterate:**
   - Update prompts
   - Re-run with same testset
   - See exact performance impact
