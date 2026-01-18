# Estimate Playground — Agent Context

## Project Intent

This is an experimental playground for exploring **how to make LLMs better at numerical estimation**. The core question: can we improve LLM accuracy on quantitative predictions through prompt engineering, structured reasoning, and domain knowledge injection?

We're not building a production system—we're running experiments, measuring results, and iterating on what works.

## What We're Exploring

- **Prompt strategies**: Minimal vs chain-of-thought vs few-shot vs persona-based approaches
- **Domain knowledge injection**: How expert facts and context affect estimation accuracy
- **Consistency & variance**: Multiple rollouts to measure prediction stability
- **Directional accuracy**: Can models correctly identify relative differences (twin scenarios)?
- **Distractor immunity**: Do irrelevant details inappropriately influence predictions?

## Tech Stack

- **Next.js 16** with App Router (React 19)
- **TypeScript** throughout
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (Radix primitives)
- **Mustache** for prompt templating
- **OpenRouter** for LLM API access
- **Zod** for schema validation

## Key Concepts

- **Scenarios**: Test cases with ground truth values and tolerance bands
- **Rollouts**: Multiple LLM calls per scenario to measure variance
- **Benchmark runs**: Collections of scenarios evaluated against a specific model + prompt combo
- **Twin pairs**: Matched scenarios with one variable changed to test directional reasoning

## Current Domain

Real estate yield estimation (rental yield %). This is a good test domain because:
- Clear numerical output
- Multiple interacting factors
- Expert knowledge exists and can be codified
- Ground truth can be calculated

## Guidelines for Development

1. **Experiment-first**: Optimize for learning, not production polish
2. **Measure everything**: Hit rate, RMSE, directional accuracy, latency, consistency
3. **Keep prompts editable**: The UI should make it easy to iterate on prompt templates
4. **Preserve runs**: Store benchmark results for comparison across experiments
5. **Stay domain-agnostic**: The framework should work for other estimation domains

## Knowledge Base

See `/knowledge/` for timestamped learnings, experiment reports, and iteration notes. This is our running log of what we discover.

---

*This file provides context for AI agents working on this codebase. Keep it updated as the project evolves.*
