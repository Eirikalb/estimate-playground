import { promises as fs } from "fs";
import path from "path";
import type {
  BenchmarkRun,
  DomainConfig,
  ExpertFacts,
  PromptTemplate,
  TestSet,
} from "@/domains/schema";
import {
  getDomain,
  getDomainConfig as getRegistryDomainConfig,
  getDomainFacts as getRegistryDomainFacts,
  listDomains as listRegistryDomains,
  ensureDomainsInitialized,
} from "@/domains";

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_DIR = path.join(DATA_DIR, "runs");
const TEST_SETS_DIR = path.join(DATA_DIR, "test-sets");
const DOMAINS_DIR = path.join(process.cwd(), "src", "domains");
const TEMPLATES_DIR = path.join(process.cwd(), "src", "prompts", "templates");

/**
 * Ensure directories exist
 */
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(RUNS_DIR, { recursive: true });
  await fs.mkdir(TEST_SETS_DIR, { recursive: true });
}

// ============ Benchmark Runs ============

/**
 * Save a benchmark run to disk
 */
export async function saveBenchmarkRun(run: BenchmarkRun): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(RUNS_DIR, `${run.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(run, null, 2));
}

/**
 * Load a benchmark run by ID
 */
export async function loadBenchmarkRun(id: string): Promise<BenchmarkRun | null> {
  try {
    const filePath = path.join(RUNS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as BenchmarkRun;
  } catch {
    return null;
  }
}

/**
 * List all benchmark runs
 */
export async function listBenchmarkRuns(): Promise<BenchmarkRun[]> {
  await ensureDirectories();
  
  try {
    const files = await fs.readdir(RUNS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    
    const runs: BenchmarkRun[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(RUNS_DIR, file), "utf-8");
        runs.push(JSON.parse(content) as BenchmarkRun);
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by timestamp descending (newest first)
    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return runs;
  } catch {
    return [];
  }
}

/**
 * Delete a benchmark run
 */
export async function deleteBenchmarkRun(id: string): Promise<boolean> {
  try {
    const filePath = path.join(RUNS_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============ Domain Configs ============

/**
 * Map domain IDs to their config file names
 * Some domain IDs differ from their file names for historical reasons
 */
function getDomainFileName(id: string): string {
  const mapping: Record<string, string> = {
    "real-estate-yield": "real-estate",
  };
  return mapping[id] || id;
}

/**
 * Load a domain config by ID
 * First tries the domain registry (plugins), then falls back to file-based loading
 */
export async function loadDomainConfig(id: string): Promise<DomainConfig | null> {
  // Try registry first (after ensuring domains are initialized)
  try {
    await ensureDomainsInitialized();
    const registryConfig = getRegistryDomainConfig(id);
    if (registryConfig) {
      return registryConfig;
    }
  } catch {
    // Registry not available, fall through to file-based
  }

  // Fallback to file-based loading
  try {
    const fileName = getDomainFileName(id);
    const filePath = path.join(DOMAINS_DIR, `${fileName}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as DomainConfig;
  } catch {
    return null;
  }
}

/**
 * Load expert facts for a domain
 * First tries the domain registry (plugins), then falls back to file-based loading
 */
export async function loadExpertFacts(domainId: string): Promise<ExpertFacts | null> {
  // Try registry first
  try {
    await ensureDomainsInitialized();
    const registryFacts = getRegistryDomainFacts(domainId);
    if (registryFacts) {
      return registryFacts;
    }
  } catch {
    // Registry not available, fall through to file-based
  }

  // Fallback to file-based loading
  try {
    const fileName = getDomainFileName(domainId);
    const filePath = path.join(DOMAINS_DIR, `${fileName}.facts.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ExpertFacts;
  } catch {
    return null;
  }
}

/**
 * Get a domain plugin by ID (from registry only)
 */
export async function getDomainPlugin(id: string) {
  await ensureDomainsInitialized();
  return getDomain(id);
}

/**
 * List all available domains
 * Combines registry domains with file-based domains (registry takes precedence)
 */
export async function listDomains(): Promise<Array<{ id: string; name: string }>> {
  const domainMap = new Map<string, { id: string; name: string }>();

  // First, try to get domains from registry
  try {
    await ensureDomainsInitialized();
    const registryDomains = listRegistryDomains();
    for (const domain of registryDomains) {
      domainMap.set(domain.id, { id: domain.id, name: domain.name });
    }
  } catch {
    // Registry not available
  }

  // Then, scan file-based domains (don't override registry)
  try {
    const files = await fs.readdir(DOMAINS_DIR);
    const configFiles = files.filter(
      (f) => f.endsWith(".json") && !f.includes(".facts.")
    );

    for (const file of configFiles) {
      try {
        const content = await fs.readFile(path.join(DOMAINS_DIR, file), "utf-8");
        const config = JSON.parse(content) as DomainConfig;
        // Only add if not already in registry
        if (!domainMap.has(config.id)) {
          domainMap.set(config.id, { id: config.id, name: config.name });
        }
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // Directory scan failed
  }

  return Array.from(domainMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ============ Prompt Templates ============

/**
 * Get the templates directory for a domain
 */
function getDomainTemplatesDir(domainId: string): string {
  // Map domain IDs to folder names
  const folderMap: Record<string, string> = {
    "real-estate-yield": "real-estate",
    "financial-forecasting": "financial",
  };
  const folder = folderMap[domainId] || domainId;
  return path.join(DOMAINS_DIR, folder, "prompts");
}

/**
 * Load a prompt template by name, optionally for a specific domain
 * Domain-specific templates take precedence over global templates
 */
export async function loadPromptTemplate(
  name: string,
  domainId?: string
): Promise<string | null> {
  // Try domain-specific template first
  if (domainId) {
    try {
      const domainTemplatesDir = getDomainTemplatesDir(domainId);
      const domainFilePath = path.join(domainTemplatesDir, `${name}.mustache`);
      return await fs.readFile(domainFilePath, "utf-8");
    } catch {
      // Fall through to global template
    }
  }

  // Fall back to global template
  try {
    const filePath = path.join(TEMPLATES_DIR, `${name}.mustache`);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * List all available prompt templates for a domain
 * Returns domain-specific templates if available, otherwise global templates
 */
export async function listPromptTemplates(domainId?: string): Promise<PromptTemplate[]> {
  const templates: PromptTemplate[] = [];

  // Try domain-specific templates first
  if (domainId) {
    try {
      const domainTemplatesDir = getDomainTemplatesDir(domainId);
      const files = await fs.readdir(domainTemplatesDir);
      const templateFiles = files.filter((f) => f.endsWith(".mustache"));

      for (const file of templateFiles) {
        const name = file.replace(".mustache", "");
        const content = await fs.readFile(
          path.join(domainTemplatesDir, file),
          "utf-8"
        );

        templates.push({
          id: name,
          name: formatTemplateName(name),
          description: getTemplateDescription(name, domainId),
          template: content,
        });
      }

      if (templates.length > 0) {
        return templates;
      }
    } catch {
      // Fall through to global templates
    }
  }

  // Fall back to global templates
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const templateFiles = files.filter((f) => f.endsWith(".mustache"));

    for (const file of templateFiles) {
      const name = file.replace(".mustache", "");
      const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf-8");

      templates.push({
        id: name,
        name: formatTemplateName(name),
        description: getTemplateDescription(name),
        template: content,
      });
    }

    return templates;
  } catch {
    return [];
  }
}

/**
 * Save a custom prompt template
 */
export async function savePromptTemplate(
  name: string,
  template: string
): Promise<void> {
  const filePath = path.join(TEMPLATES_DIR, `${name}.mustache`);
  await fs.writeFile(filePath, template);
}

// ============ Helpers ============

function formatTemplateName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getTemplateDescription(name: string, domainId?: string): string {
  // Domain-specific descriptions
  if (domainId === "financial-forecasting") {
    const financialDescriptions: Record<string, string> = {
      persona: "Senior equity research analyst with growth metrics expertise",
      "chain-of-thought": "Step-by-step growth rate analysis",
      "chain-of-thought-enhanced": "Enhanced methodology with explicit arithmetic",
      "few-shot": "Learning from company growth examples",
      minimal: "Minimal context, baseline test",
      "benchmark-only": "Only growth benchmarks, no additional guidance",
    };
    if (financialDescriptions[name]) {
      return financialDescriptions[name];
    }
  }

  // Default (real-estate or generic) descriptions
  const descriptions: Record<string, string> = {
    persona: "Full expert persona with all facts and methodology",
    "chain-of-thought": "Structured step-by-step reasoning approach",
    "chain-of-thought-enhanced": "Enhanced methodology with explicit calculations",
    "few-shot": "Learning from examples approach",
    minimal: "Bare minimum context, baseline test",
    "benchmark-only": "Only benchmark ranges, no additional guidance",
  };
  return descriptions[name] ?? "Custom template";
}

// ============ Test Sets ============

/**
 * Save a test set to disk
 */
export async function saveTestSet(testSet: TestSet): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(TEST_SETS_DIR, `${testSet.name}.json`);
  await fs.writeFile(filePath, JSON.stringify(testSet, null, 2));
}

/**
 * Load a test set by name
 */
export async function loadTestSet(name: string): Promise<TestSet | null> {
  try {
    const filePath = path.join(TEST_SETS_DIR, `${name}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as TestSet;
  } catch {
    return null;
  }
}

/**
 * List all test sets (metadata only, without full scenarios)
 */
export async function listTestSets(): Promise<Array<Omit<TestSet, 'scenarios'>>> {
  await ensureDirectories();

  try {
    const files = await fs.readdir(TEST_SETS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const testSets: Array<Omit<TestSet, 'scenarios'>> = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(TEST_SETS_DIR, file), "utf-8");
        const testSet = JSON.parse(content) as TestSet;
        // Omit scenarios to reduce payload size for listing
        const { scenarios, ...metadata } = testSet;
        testSets.push(metadata);
      } catch {
        // Skip invalid files
      }
    }

    // Sort by created date descending (newest first)
    testSets.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return testSets;
  } catch {
    return [];
  }
}

/**
 * Delete a test set
 */
export async function deleteTestSet(name: string): Promise<boolean> {
  try {
    const filePath = path.join(TEST_SETS_DIR, `${name}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

