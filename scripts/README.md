# Test Set Scripts

This directory contains scripts for managing test sets and running batch experiments.

## Quick Start

### 1. Create a test set from an existing run
```bash
node scripts/create-testset-from-run.js --run <run-id> --name baseline-v1
```

### 2. Generate a new test set from scratch
```bash
node scripts/generate-testset.js --name comprehensive-v1 --size 15 --twins --seed 42424242
```

### 3. Run a single configuration against a test set
```bash
node scripts/run-testset.js --testset baseline-v1 --model google/gemini-3-flash-preview --prompt chain-of-thought
```

### 4. Batch test multiple configurations
```bash
node scripts/batch-test.js --testset baseline-v1 --models gemini,gpt4,gpt4-mini --prompts chain-of-thought,chain-of-thought-enhanced
```

## Script Reference

### create-testset-from-run.js
Convert an existing benchmark run into a reusable test set.

**Usage:**
```bash
node scripts/create-testset-from-run.js --run <run-id> --name <testset-name> [options]
```

**Options:**
- `--run <id>` - Source run ID (required)
- `--name <name>` - Test set name (required)
- `--description <text>` - Custom description (optional)
- `--version <version>` - Version number (default: 1.0.0)

**Example:**
```bash
node scripts/create-testset-from-run.js \
  --run 8995522b-0b4b-4379-a231-0ea1a53e43f0 \
  --name baseline-v1 \
  --description "Baseline scenarios from 90% hit rate run"
```

### generate-testset.js
Generate a new test set with fresh scenarios.

**Usage:**
```bash
node scripts/generate-testset.js --name <testset-name> [options]
```

**Options:**
- `--name <name>` - Test set name (required)
- `--description <text>` - Description of the test set
- `--domain <id>` - Domain ID (default: real-estate-yield)
- `--size <n>` - Number of base scenarios (default: 10)
- `--twins` - Generate twin pairs (default: true)
- `--no-twins` - Skip twin generation
- `--seed <n>` - Random seed for reproducibility
- `--narrative` - Use LLM-based narratives (default: true)
- `--no-narrative` - Use simple template-based descriptions
- `--model <model>` - Model for narrative generation (default: openai/gpt-4o-mini)

**Examples:**
```bash
# Quick smoke test set
node scripts/generate-testset.js --name smoke-v1 --size 5 --no-twins --seed 12345

# Comprehensive test set with narratives
node scripts/generate-testset.js \
  --name comprehensive-v1 \
  --size 15 \
  --twins \
  --narrative \
  --model openai/gpt-4o-mini \
  --seed 42424242
```

### run-testset.js
Run a test set with a specific model and prompt configuration.

**Usage:**
```bash
node scripts/run-testset.js --testset <name> --model <model> --prompt <template> [options]
```

**Options:**
- `--testset <name>` - Test set name (required)
- `--model <model>` - Model to test (required)
- `--prompt <template>` - Prompt template ID (required)
- `--rollouts <n>` - Number of rollouts per scenario (default: 3)

**Examples:**
```bash
# Test Gemini with chain-of-thought
node scripts/run-testset.js \
  --testset baseline-v1 \
  --model google/gemini-3-flash-preview \
  --prompt chain-of-thought

# Test GPT-4o with enhanced prompt and 5 rollouts
node scripts/run-testset.js \
  --testset baseline-v1 \
  --model openai/gpt-4o \
  --prompt chain-of-thought-enhanced \
  --rollouts 5
```

### batch-test.js
Run a test set across multiple model and prompt configurations.

**Usage:**
```bash
node scripts/batch-test.js --testset <name> [options]
```

**Options:**
- `--testset <name>` - Test set name (required)
- `--models <list>` - Comma-separated model shortcuts (optional)
- `--prompts <list>` - Comma-separated prompt template IDs (optional)
- `--config <file>` - JSON file with configurations (optional)
- `--rollouts <n>` - Number of rollouts per scenario (default: 3)
- `--delay <ms>` - Delay between runs in ms (default: 1000)

**Model Shortcuts:**
- `gemini` / `gemini-flash` → google/gemini-3-flash-preview
- `gpt4` / `gpt4o` → openai/gpt-4o
- `gpt4-mini` / `gpt4o-mini` → openai/gpt-4o-mini

**Examples:**
```bash
# Test all combinations of models and prompts
node scripts/batch-test.js \
  --testset baseline-v1 \
  --models gemini,gpt4,gpt4-mini \
  --prompts chain-of-thought,chain-of-thought-enhanced

# Use a config file
node scripts/batch-test.js --testset baseline-v1 --config my-configs.json

# Quick 2-config test
node scripts/batch-test.js \
  --testset smoke-v1 \
  --models gemini \
  --prompts chain-of-thought,minimal
```

**Config File Format:**
```json
[
  {
    "model": "google/gemini-3-flash-preview",
    "promptTemplateId": "chain-of-thought"
  },
  {
    "model": "openai/gpt-4o",
    "promptTemplateId": "chain-of-thought-enhanced"
  }
]
```

## Workflow Examples

### Baseline Testing Workflow
```bash
# 1. Create baseline test set from a good run
node scripts/create-testset-from-run.js \
  --run 8995522b-0b4b-4379-a231-0ea1a53e43f0 \
  --name baseline-v1

# 2. Test multiple configurations
node scripts/batch-test.js \
  --testset baseline-v1 \
  --models gemini,gpt4,gpt4-mini \
  --prompts chain-of-thought,chain-of-thought-enhanced

# Results saved to: data/batch-test-baseline-v1-<date>.json
```

### Smoke Test Workflow
```bash
# 1. Generate quick smoke test
node scripts/generate-testset.js \
  --name smoke-v1 \
  --size 5 \
  --no-twins \
  --seed 99999

# 2. Quick validation test
node scripts/run-testset.js \
  --testset smoke-v1 \
  --model google/gemini-3-flash-preview \
  --prompt chain-of-thought \
  --rollouts 1
```

### Comprehensive Testing Workflow
```bash
# 1. Generate comprehensive test set
node scripts/generate-testset.js \
  --name comprehensive-v1 \
  --size 20 \
  --twins \
  --narrative \
  --seed 42424242

# 2. Run full batch test
node scripts/batch-test.js \
  --testset comprehensive-v1 \
  --models gemini,gpt4,gpt4-mini \
  --prompts chain-of-thought,chain-of-thought-enhanced,persona \
  --rollouts 5

# 3. Compare results in dashboard
# Visit: http://localhost:3000
```

## Test Set Management

### List available test sets
```bash
# Via API
curl http://localhost:3000/api/test-sets

# Or check directory
ls data/test-sets/
```

### View test set details
```bash
# Via API
curl http://localhost:3000/api/test-sets/baseline-v1

# Or read file
cat data/test-sets/baseline-v1.json
```

### Delete a test set
```bash
# Via API
curl -X DELETE http://localhost:3000/api/test-sets/baseline-v1

# Or remove file
rm data/test-sets/baseline-v1.json
```

## Tips

1. **Use fixed seeds** for reproducible test sets
2. **Version your test sets** (v1, v2, etc.) when making changes
3. **Start with smoke tests** (5-10 scenarios) for quick validation
4. **Use comprehensive tests** (20-30 scenarios) for final validation
5. **Commit test sets to git** for team collaboration
6. **Document test set purposes** in descriptions
7. **Track which test sets were used** in run metadata

## Troubleshooting

**Server not running:**
```bash
npm run dev
```

**Missing test set:**
```bash
# List available test sets
ls data/test-sets/
```

**API key not configured:**
```bash
# Add to .env.local
OPENROUTER_API_KEY=your-key-here
```

**Rate limiting:**
```bash
# Increase delay between runs
node scripts/batch-test.js --testset baseline-v1 --delay 2000
```
