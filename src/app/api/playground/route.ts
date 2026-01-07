import { NextResponse } from "next/server";
import { loadDomainConfig, loadExpertFacts } from "@/lib/storage";
import { generateScenarios, upgradeScenarioNarrative } from "@/lib/generator";
import { renderPrompt, buildTemplateContext } from "@/prompts/engine";
import { callOpenRouterMultiple, type OpenRouterConfig } from "@/lib/openrouter";
import { evaluateMultipleRollouts } from "@/lib/evaluator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      domainId,
      model,
      promptTemplate,
      scenario: providedScenario,
      rolloutsPerScenario = 1,
      seed,
      useNarrativeDescription = false,
      narrativeModel,
    } = body;

    // Validate required fields
    if (!domainId || !promptTemplate) {
      return NextResponse.json(
        { error: "domainId and promptTemplate are required" },
        { status: 400 }
      );
    }

    // Validate rollouts (1-10)
    const rollouts = Math.max(1, Math.min(10, rolloutsPerScenario));

    // Load domain config and facts
    const domainConfig = await loadDomainConfig(domainId);
    const expertFacts = await loadExpertFacts(domainId);

    if (!domainConfig || !expertFacts) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Get API key (needed for narrative generation)
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Use provided scenario or generate one
    let scenario = providedScenario;
    if (!scenario) {
      const scenarios = generateScenarios(domainConfig, {
        count: 1,
        generateTwins: false,
        seed: seed || Date.now(),
      });
      scenario = scenarios[0];
    }

    // Upgrade to LLM-based narrative if requested
    if (useNarrativeDescription && apiKey) {
      scenario = await upgradeScenarioNarrative(
        domainConfig,
        scenario,
        {
          apiKey,
          model: narrativeModel || "openai/gpt-4o-mini",
        },
        seed || Date.now()
      );
    }

    // Build template context for preview
    const context = buildTemplateContext(domainConfig, expertFacts, scenario);

    // Render the prompt
    const renderedPrompt = renderPrompt(
      promptTemplate,
      domainConfig,
      expertFacts,
      scenario
    );

    // If no model specified, just return the preview
    if (!model) {
      return NextResponse.json({
        scenario,
        renderedPrompt,
        context,
      });
    }

    // Check API key is available for LLM evaluation
    const llmApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!llmApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Run through LLM with multiple rollouts
    const config: OpenRouterConfig = {
      apiKey: llmApiKey,
      model,
      temperature: 0.3,
    };

    const llmResults = await callOpenRouterMultiple(renderedPrompt, config, rollouts);
    const result = evaluateMultipleRollouts(scenario, llmResults);

    return NextResponse.json({
      scenario,
      renderedPrompt,
      context,
      result,
      rollouts: llmResults.map((r) => ({
        prediction: r.prediction.yield,
        reasoning: r.prediction.reasoning,
        latencyMs: r.latencyMs,
        rawResponse: r.rawResponse,
      })),
    });
  } catch (error) {
    console.error("Playground error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
