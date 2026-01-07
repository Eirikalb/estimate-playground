# Data Directory

This directory stores benchmark run results as JSON files.

Each run is stored in `runs/{run-id}.json` and contains:
- Run metadata (model, prompt strategy, timestamp)
- Generated scenarios with ground truth
- LLM predictions and evaluation results
- Aggregate metrics

These files are gitignored by default. To share results, you can commit them manually.

