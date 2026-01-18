#!/bin/bash

# Example Testing Workflow
# This script demonstrates a complete testing workflow using testsets

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Estimate Playground - Example Testing Workflow               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Create a baseline test set from an existing run
echo "Step 1: Creating baseline test set from existing run..."
echo "────────────────────────────────────────────────────────────────"

# Find the most recent completed run
LATEST_RUN=$(ls -t data/runs/*.json 2>/dev/null | head -1 | xargs -I {} basename {} .json)

if [ -z "$LATEST_RUN" ]; then
  echo "❌ No existing runs found. Please run a benchmark first."
  echo ""
  echo "To create a run:"
  echo "  1. Start the server: npm run dev"
  echo "  2. Visit http://localhost:3000"
  echo "  3. Create a benchmark run"
  echo ""
  exit 1
fi

echo "Using run: $LATEST_RUN"
node scripts/create-testset-from-run.js \
  --run "$LATEST_RUN" \
  --name example-baseline-v1 \
  --description "Example baseline test set for demonstration"

echo ""
echo ""

# Step 2: Generate a small smoke test set
echo "Step 2: Generating smoke test set (5 scenarios)..."
echo "────────────────────────────────────────────────────────────────"

node scripts/generate-testset.js \
  --name example-smoke-v1 \
  --size 5 \
  --no-twins \
  --seed 12345 \
  --description "Quick smoke test with 5 scenarios"

echo ""
echo ""

# Step 3: Run smoke test with one configuration
echo "Step 3: Running smoke test with Gemini..."
echo "────────────────────────────────────────────────────────────────"

node scripts/run-testset.js \
  --testset example-smoke-v1 \
  --model google/gemini-3-flash-preview \
  --prompt chain-of-thought \
  --rollouts 1

echo ""
echo ""

# Step 4: Batch test baseline with multiple configurations
echo "Step 4: Running batch test on baseline (this may take a while)..."
echo "────────────────────────────────────────────────────────────────"

node scripts/batch-test.js \
  --testset example-baseline-v1 \
  --models gemini,gpt4-mini \
  --prompts chain-of-thought,minimal \
  --rollouts 3 \
  --delay 2000

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Workflow Complete!                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "What was created:"
echo "  ✅ example-baseline-v1 test set (from existing run)"
echo "  ✅ example-smoke-v1 test set (5 fresh scenarios)"
echo "  ✅ Multiple benchmark runs for comparison"
echo ""
echo "Next steps:"
echo "  1. View results: http://localhost:3000"
echo "  2. Check test sets: ls data/test-sets/"
echo "  3. View batch results: cat data/batch-test-*.json"
echo ""
echo "Clean up (optional):"
echo "  rm data/test-sets/example-*.json"
echo ""
