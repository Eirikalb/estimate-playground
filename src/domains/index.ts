/**
 * Domain Registry
 *
 * Central registry for domain plugins. Provides loading, registration,
 * and lookup functionality for multi-domain support.
 */

import type { DomainPlugin, DomainInfo } from "./types";
import type { DomainConfig, ExpertFacts } from "./schema";

// Domain plugin registry
const domainRegistry: Map<string, DomainPlugin> = new Map();

// Flag to track if domains have been initialized
let initialized = false;

/**
 * Register a domain plugin
 */
export function registerDomain(plugin: DomainPlugin): void {
  domainRegistry.set(plugin.config.id, plugin);
}

/**
 * Get a domain plugin by ID
 */
export function getDomain(id: string): DomainPlugin | null {
  return domainRegistry.get(id) ?? null;
}

/**
 * Check if a domain is registered
 */
export function hasDomain(id: string): boolean {
  return domainRegistry.has(id);
}

/**
 * List all registered domains with metadata
 */
export function listDomains(): DomainInfo[] {
  const domains: DomainInfo[] = [];

  for (const plugin of domainRegistry.values()) {
    const config = plugin.config;
    domains.push({
      id: config.id,
      name: config.name,
      description: config.description,
      outputUnit: config.outputUnit,
      outputLabel: "outputLabel" in config ? (config as any).outputLabel : "Estimate",
      entityLabel: "entityLabel" in config ? (config as any).entityLabel : "Subject",
    });
  }

  return domains.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get domain config by ID
 */
export function getDomainConfig(id: string): DomainConfig | null {
  const plugin = getDomain(id);
  return plugin?.config ?? null;
}

/**
 * Get domain facts by ID
 */
export function getDomainFacts(id: string): ExpertFacts | null {
  const plugin = getDomain(id);
  return plugin?.facts ?? null;
}

/**
 * Initialize all domain plugins
 * This function is called once at startup to register all domains.
 */
export async function initializeDomains(): Promise<void> {
  if (initialized) return;

  // Import domain plugins dynamically to avoid circular dependencies
  // These will be created in subsequent sessions
  try {
    const { realEstatePlugin } = await import("./real-estate");
    registerDomain(realEstatePlugin);
  } catch (e) {
    console.warn("Real estate domain not yet available:", e);
  }

  try {
    const { financialPlugin } = await import("./financial");
    registerDomain(financialPlugin);
  } catch (e) {
    console.warn("Financial domain not yet available:", e);
  }

  initialized = true;
}

/**
 * Ensure domains are initialized (lazy initialization)
 */
export async function ensureDomainsInitialized(): Promise<void> {
  if (!initialized) {
    await initializeDomains();
  }
}

/**
 * Get all registered domain IDs
 */
export function getDomainIds(): string[] {
  return Array.from(domainRegistry.keys());
}

/**
 * Clear all registered domains (useful for testing)
 */
export function clearDomains(): void {
  domainRegistry.clear();
  initialized = false;
}
