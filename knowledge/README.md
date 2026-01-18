# Knowledge Base

This folder contains our running log of learnings, experiment reports, and iteration notes.

## Structure

Files should be named with timestamps for chronological ordering:

```
YYYY-MM-DD-short-description.md
```

Example: `2026-01-18-initial-baseline-results.md`

## What Goes Here

- **Experiment reports**: Results from benchmark runs, what we tested, what we learned
- **Observations**: Patterns noticed across multiple runs
- **Hypotheses**: Ideas to test in future experiments
- **Iteration notes**: Why we changed a prompt strategy or added a feature
- **Dead ends**: What didn't work and why (equally valuable)

## Format Suggestion

```markdown
# [Title]

**Date**: YYYY-MM-DD
**Run IDs**: [list relevant benchmark run IDs if applicable]

## Context
What prompted this experiment/observation?

## What We Did
Brief description of the experiment or change.

## Results
Key findings, metrics, observations.

## Takeaways
What we learned. What to try next.
```

---

## Current Learnings

### 2026-01-18: GPT Model + Prompt Engineering Analysis
**Key Finding:** Enhanced prompts with explicit arithmetic degrade ALL models - more structure isn't better.

**Quick Stats:**
- Gemini 3 Flash: 90% → 63.6% with enhanced prompt (-26pp) ❌
- GPT-4o: 63.6% → 45.5% hit rate with enhanced prompt (-18pp) ❌
- GPT-4o-mini: Same hit rate (54.5%) but better RMSE (0.65 → 0.46)
- **Critical insight:** Rigid arithmetic format causes rounding errors and constrains reasoning
- **Universal pattern:** Enhanced prompt hurts every model except weakest (GPT-4o-mini)

**Recommendation:** Stick with current CoT prompt - flexibility > structure

**See:** [gpt-prompt-engineering-analysis-2026-01-18.md](gpt-prompt-engineering-analysis-2026-01-18.md)

---

### 2026-01-18: Gemini Model Analysis
**Key Finding:** Gemini 3 Flash Preview achieves 90% hit rate with chain-of-thought prompting.

**Quick Stats:**
- Best config: Gemini 3 Flash + chain-of-thought
- Performance: 90% hit rate, 0.24 RMSE, 90% consistency
- Failed models: Gemini 1.5 Flash/Pro (API unavailable)
- Critical insight: Prompt structure dramatically impacts performance (0% → 90% hit rate)

**See:** [gemini-model-analysis-2026-01-18.md](gemini-model-analysis-2026-01-18.md) for full report

---

*Keep entries concise. Link to run data rather than duplicating it.*
