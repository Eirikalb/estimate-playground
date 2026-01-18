# Quick Start: Testing with Test Sets

Get started with reproducible testing in 5 minutes.

## Prerequisites

1. Server running: `npm run dev`
2. At least one benchmark run exists (create via UI if needed)

## Step 1: Create Your First Test Set

Use an existing successful run as your baseline:

```bash
# Find a recent run ID
ls data/runs/*.json | head -1

# Create testset from it
node scripts/create-testset-from-run.js \
  --run <paste-run-id-here> \
  --name my-baseline-v1
```

**Output:**
```
✅ Test set created successfully!

Name: my-baseline-v1
Version: 1.0.0
Scenarios: 11
Source run: 8995522b...

Saved to: data/test-sets/my-baseline-v1.json
```

## Step 2: Run a Single Test

Test one model/prompt combination:

```bash
node scripts/run-testset.js \
  --testset my-baseline-v1 \
  --model google/gemini-3-flash-preview \
  --prompt chain-of-thought
```

**Output:**
```
✅ Run completed!

Run ID: abc123...
Results:
  Hit Rate: 90.9%
  Mean Error: 0.15%
  RMSE: 0.22%
  Avg Latency: 1234ms

Saved to: data/runs/abc123.json
View at: http://localhost:3000/runs/abc123
```

## Step 3: Batch Test Multiple Configurations

Compare all combinations at once:

```bash
node scripts/batch-test.js \
  --testset my-baseline-v1 \
  --models gemini,gpt4-mini \
  --prompts chain-of-thought,minimal
```

**Output:**
```
═══════════════════════════════════════════════════════════════
BATCH TEST RESULTS
═══════════════════════════════════════════════════════════════

Configuration                              Hit Rate   RMSE
────────────────────────────────────────  ─────────  ──────
gemini + chain-of-thought                     90.9%   0.22%
gemini + minimal                              81.8%   0.35%
gpt4-mini + chain-of-thought                  90.9%   0.24%
gpt4-mini + minimal                           72.7%   0.41%

🏆 Best performer: gemini + chain-of-thought
   Hit Rate: 90.9%, RMSE: 0.22%

Summary saved to: data/batch-test-my-baseline-v1-2026-01-18.json
```

## That's It!

You now have:
- ✅ A reproducible test set
- ✅ Consistent scenarios across all tests
- ✅ Fair comparison of models and prompts
- ✅ Batch test results for analysis

## Next Steps

### Create a Smoke Test (Fast)
For quick iteration:

```bash
node scripts/generate-testset.js \
  --name smoke-v1 \
  --size 5 \
  --no-twins \
  --seed 99999
```

### Create Comprehensive Test (Thorough)
For final validation:

```bash
node scripts/generate-testset.js \
  --name comprehensive-v1 \
  --size 20 \
  --twins \
  --narrative \
  --seed 42424242
```

### View Your Test Sets

```bash
# List all testsets
ls data/test-sets/

# View testset details
cat data/test-sets/my-baseline-v1.json | head -50
```

## Common Workflows

### Daily Development
```bash
# Quick smoke test
node scripts/run-testset.js \
  --testset smoke-v1 \
  --model gemini \
  --prompt <your-new-prompt> \
  --rollouts 1
```

### Before Committing Changes
```bash
# Full baseline test
node scripts/run-testset.js \
  --testset my-baseline-v1 \
  --model gemini \
  --prompt <your-prompt> \
  --rollouts 3
```

### Comparing Multiple Approaches
```bash
# Batch test all combinations
node scripts/batch-test.js \
  --testset my-baseline-v1 \
  --models gemini,gpt4,gpt4-mini \
  --prompts prompt-v1,prompt-v2,prompt-v3
```

## Tips

1. **Use meaningful names**: `baseline-v1`, `edge-cases-v1`, `smoke-v1`
2. **Version your testsets**: Increment version when scenarios change
3. **Keep smoke tests fast**: 5-10 scenarios, no twins, 1 rollout
4. **Make comprehensive tests thorough**: 20-30 scenarios, twins, 3-5 rollouts
5. **Commit testsets to git**: Share with team, track changes

## Troubleshooting

**No runs found:**
```bash
# Create one via UI first
open http://localhost:3000
```

**Server not running:**
```bash
npm run dev
```

**Need help:**
```bash
# View detailed docs
cat TESTSETS.md
cat scripts/README.md

# Or check implementation notes
cat TESTSETS-IMPLEMENTATION.md
```

## Model Shortcuts

For convenience in batch testing:

- `gemini` → `google/gemini-3-flash-preview`
- `gpt4` → `openai/gpt-4o`
- `gpt4-mini` → `openai/gpt-4o-mini`

## More Examples

See [scripts/README.md](scripts/README.md) for complete documentation and advanced usage.
