import { NextResponse } from "next/server";
import { loadDomainConfig, loadExpertFacts } from "@/lib/storage";
import { generateScenarios } from "@/lib/generator";
import { renderPrompt, buildTemplateContext } from "@/prompts/engine";
import { callOpenRouter, type OpenRouterConfig } from "@/lib/openrouter";
import { evaluatePrediction } from "@/lib/evaluator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      domainId,
      model,
      promptTemplate,
      scenario: providedScenario,
      seed,
    } = body;

    // Validate required fields
    if (!domainId || !promptTemplate) {
      return NextResponse.json(
        { error: "domainId and promptTemplate are required" },
        { status: 400 }
      );
    }

    // Load domain config and facts
    const domainConfig = await loadDomainConfig(domainId);
    const expertFacts = await loadExpertFacts(domainId);

    if (!domainConfig || !expertFacts) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

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

    // Get API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Run through LLM
    const config: OpenRouterConfig = {
      apiKey,
      model,
      temperature: 0.3,
    };

    const llmResult = await callOpenRouter(renderedPrompt, config);
    const result = evaluatePrediction(scenario, llmResult);

    return NextResponse.json({
      scenario,
      renderedPrompt,
      context,
      result,
      rawResponse: llmResult.rawResponse,
      latencyMs: llmResult.latencyMs,
    });
  } catch (error) {
    console.error("Playground error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

