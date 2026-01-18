# Using Test Sets in the Web UI

The Playground page now supports selecting and running test sets directly from the web interface.

## How to Use Test Sets in the Playground

### 1. Navigate to Playground

Visit [http://localhost:3000/playground](http://localhost:3000/playground)

### 2. Enable "Use Test Set"

In the Configuration panel, you'll see a toggle labeled **"Use Test Set"**:

```
┌─────────────────────────────────────────┐
│ Use Test Set                      [ ]   │
│ Use fixed scenarios from a test set     │
│ instead of generating new ones          │
└─────────────────────────────────────────┘
```

Toggle it ON to switch from generating scenarios to using a test set.

### 3. Select a Test Set

When enabled, a dropdown will appear showing all available test sets:

```
┌─────────────────────────────────────────┐
│ Select Test Set                         │
│ ┌─────────────────────────────────────┐ │
│ │ baseline-v1                         │ │
│ │ 11 scenarios • v1.0.0               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Test set extracted from run 8995522b.  │
│ 11 scenarios using google/gemini-3...  │
└─────────────────────────────────────────┘
```

Each test set shows:
- **Name** (e.g., baseline-v1)
- **Scenario count** (e.g., 11 scenarios)
- **Version** (e.g., v1.0.0)
- **Description** (below the dropdown)

### 4. Configure Your Test

With a test set selected, you can configure:
- **Model** - Which LLM to use
- **Prompt Template** - Which prompt strategy to apply
- **Rollouts** - Number of rollouts per scenario (1-10)

The following options are **disabled** when using a test set:
- Scenario count (uses testset's scenario count)
- Seed (uses testset's seed)
- Narrative generation (uses testset's pre-generated narratives)

### 5. Run Benchmark

Click **"Run Benchmark"** to execute the test:

```
┌─────────────────────────────────────────┐
│ [Generate Preview]                      │
│ [Run Single Scenario]                   │
│ [Run Benchmark (33 calls)]             │
└─────────────────────────────────────────┘
```

The button shows the total API calls required (scenarios × rollouts).

### 6. View Results

The run will be saved and you'll be redirected to the results page showing:
- Hit rate across all scenarios
- Mean error and RMSE
- Individual scenario results
- Consistency metrics (if rollouts > 1)

## Benefits

### Fair Comparison
Run the same scenarios across different:
- Models (Gemini, GPT-4, GPT-4-mini, etc.)
- Prompt templates (chain-of-thought, minimal, persona, etc.)
- Configurations (different rollout counts)

### Time Savings
- No narrative generation time (scenarios already created)
- Faster benchmark runs
- Consistent test environment

### Reproducibility
- Same scenarios = same difficulty
- Version-controlled test sets
- Traceable results (runs record which testset was used)

## UI States

### When Test Set is OFF (Default)
- Shows scenario count input
- Shows seed input
- Shows narrative generation toggle
- Generates fresh scenarios on each run

### When Test Set is ON
- Shows test set dropdown
- Hides scenario count (uses testset's count)
- Hides seed (uses testset's seed)
- Hides narrative toggle (uses testset's narratives)
- Shows blue info box with testset details

### Info Boxes

**Test Set Selected:**
```
┌─────────────────────────────────────────┐
│ ℹ Using fixed testset: 11 scenarios    │
│   already generated. (with narratives)  │
└─────────────────────────────────────────┘
```

**No Test Sets Available:**
```
┌─────────────────────────────────────────┐
│ Select Test Set                         │
│ ┌─────────────────────────────────────┐ │
│ │ No test sets available              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

If no test sets exist, create one using:
```bash
node scripts/create-testset-from-run.js --run <run-id> --name my-test-v1
```

## Example Workflow

### Create a Test Set (One Time)
```bash
# From an existing successful run
node scripts/create-testset-from-run.js \
  --run 8995522b-0b4b-4379-a231-0ea1a53e43f0 \
  --name baseline-v1
```

### Use in UI (Repeatedly)
1. Go to `/playground`
2. Toggle "Use Test Set" ON
3. Select "baseline-v1"
4. Choose model: `google/gemini-3-flash-preview`
5. Choose prompt: `chain-of-thought`
6. Set rollouts: `3`
7. Click "Run Benchmark"

### Compare Configurations
Repeat steps 4-7 with different:
- Models (GPT-4, GPT-4-mini, etc.)
- Prompts (minimal, enhanced, persona, etc.)
- Rollout counts (1, 3, 5, 10)

All runs use the **exact same scenarios**, enabling fair comparison.

## Tips

1. **Create testsets from your best runs** - This preserves good scenario distributions

2. **Use descriptive names** - `baseline-v1`, `edge-cases-v1`, `comprehensive-v1`

3. **Version your testsets** - When scenarios change, increment version

4. **Check testset metadata** - The description shows scenario count and properties

5. **Run multiple times** - Use different rollout counts to measure consistency

6. **Compare in dashboard** - All runs are saved with testset references for comparison

## Comparison: Test Set vs Generated Scenarios

| Aspect | Test Set | Generated Scenarios |
|--------|----------|---------------------|
| Scenarios | Fixed, pre-generated | Fresh on each run |
| Narratives | Pre-generated | Generated each run (slow) |
| Reproducibility | ✅ Same every time | ❌ Random each time |
| Speed | ⚡ Fast | 🐌 Slower (narrative gen) |
| Comparison | ✅ Fair | ⚠️ Variable difficulty |
| Use case | Production testing | Exploration |

## Creating Test Sets

See these guides for creating test sets:
- **From existing run:** [scripts/README.md](scripts/README.md#create-testset-from-runjs)
- **From scratch:** [scripts/README.md](scripts/README.md#generate-testsetjs)
- **Batch testing:** [scripts/README.md](scripts/README.md#batch-testjs)
- **Full docs:** [TESTSETS.md](TESTSETS.md)
