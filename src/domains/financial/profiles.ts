/**
 * Financial Domain - Company Profiles and Archetypes
 *
 * Provides rich context for generating realistic company narratives
 * in investment memo style.
 */

// Company name components for generating fictional companies
export const companyNames: Record<string, string[]> = {
  saas: [
    "CloudScale", "DataFlow", "Nexus Platform", "Synergy Systems", "Vertex Cloud",
    "Pulse Analytics", "Streamline", "Catalyst", "Horizon SaaS", "Elevate.io",
    "Quantum Logic", "PivotPoint", "Ascend Software", "Beacon Labs", "Forge Tech"
  ],
  fintech: [
    "PayStream", "LendTech", "WealthOS", "CryptoCore", "FinanceFlow",
    "Mint Capital", "ClearPay", "Vault Financial", "Apex Payments", "Neon Bank",
    "Atlas Finance", "Prism Payments", "Ember Financial", "Coast Capital", "Bloom Pay"
  ],
  ecommerce: [
    "ShopWave", "RetailX", "CartFlow", "Merchant Hub", "BuyDirect",
    "StoreScale", "CommerceCloud", "Orderfy", "BrandBox", "MarketMesh",
    "Sellr", "Checkout Labs", "Inventory Pro", "FulfillNow", "PackShip"
  ],
  healthcare: [
    "MedTech Solutions", "HealthOS", "CareFlow", "Clinic Cloud", "VitalSign AI",
    "PatientPath", "DiagnostiX", "TherapyTech", "Wellness Labs", "BioMetric",
    "HealthVault", "MediSync", "CarePoint", "LifeScience Pro", "NurseTech"
  ],
  manufacturing: [
    "Precision Industries", "MetalWorks Corp", "Assembly Pro", "Industrial Dynamics",
    "Forge Manufacturing", "TechFab", "ComponentPro", "BuildRight", "FactoryOS",
    "SupplyChain Masters", "QualityFirst", "Lean Manufacturing Co", "AutoParts Inc"
  ],
  retail: [
    "ValueMart", "ShopLocal", "BrandStore", "RetailPro", "StoreChain",
    "MainStreet Retail", "FashionForward", "HomeGoods Plus", "QuickMart", "StyleHub"
  ],
  consulting: [
    "Strategy Partners", "Growth Advisory", "Insight Consulting", "Apex Partners",
    "Bridge Consulting", "Summit Advisors", "Peak Performance", "Clarity Group",
    "Transform Consulting", "Elevate Partners", "Frontier Advisory", "Catalyst Consulting"
  ]
};

// Founder backgrounds for narratives
export const founderBackgrounds = [
  "former product manager at a major tech company",
  "serial entrepreneur with two successful exits",
  "ex-McKinsey consultant turned operator",
  "technical founder with PhD from Stanford",
  "industry veteran with 20 years of experience",
  "former VP of Engineering at a unicorn",
  "investment banker turned entrepreneur",
  "domain expert from a Fortune 500 company",
  "YC alum with deep technical background",
  "former founder of an acquired startup"
];

// Investor names for funding narratives
export const investorNames = [
  "Sequoia Capital", "Andreessen Horowitz", "Index Ventures", "Accel Partners",
  "Benchmark", "Lightspeed Venture Partners", "General Catalyst", "Bessemer Venture Partners",
  "Insight Partners", "Tiger Global", "Coatue Management", "Addition",
  "Nordic Capital", "Northzone", "Creandum", "EQT Ventures"
];

// Market segments and verticals
export const marketSegments = [
  "enterprise software", "SMB solutions", "developer tools", "infrastructure",
  "vertical SaaS", "horizontal SaaS", "consumer fintech", "B2B fintech",
  "healthtech", "edtech", "proptech", "legaltech", "insurtech", "regtech"
];

// Company stage profiles with characteristics
export interface CompanyProfile {
  stages: string[];
  characteristics: string[];
  metrics: string[];
  challenges: string[];
  opportunities: string[];
}

export const companyProfiles: Record<string, CompanyProfile> = {
  saas_startup_growth: {
    stages: ["Seed", "Series A", "Pre-Series B"],
    characteristics: [
      "product-led growth motion",
      "founder-led sales",
      "early enterprise traction",
      "strong developer community",
      "viral adoption in target segment"
    ],
    metrics: ["$500K-$5M ARR", "2-3x YoY growth", "high burn multiple"],
    challenges: [
      "scaling beyond founder sales",
      "enterprise readiness",
      "competitive differentiation"
    ],
    opportunities: [
      "category creation",
      "land-and-expand",
      "platform extension"
    ]
  },
  saas_scaleup_growth: {
    stages: ["Series B", "Series C", "Growth stage"],
    characteristics: [
      "established sales organization",
      "multi-product expansion",
      "international presence",
      "enterprise customer base"
    ],
    metrics: ["$5M-$50M ARR", "50-80% YoY growth", "improving efficiency"],
    challenges: [
      "sales productivity",
      "product complexity",
      "market saturation in core segment"
    ],
    opportunities: [
      "adjacent markets",
      "M&A bolt-ons",
      "platform strategy"
    ]
  },
  saas_enterprise_growth: {
    stages: ["Late stage", "Pre-IPO", "Public"],
    characteristics: [
      "market leader in category",
      "diversified revenue streams",
      "global operations",
      "strong brand recognition"
    ],
    metrics: ["$50M+ ARR", "20-35% YoY growth", "Rule of 40 compliant"],
    challenges: [
      "law of large numbers",
      "competition from well-funded startups",
      "innovation pace"
    ],
    opportunities: [
      "market consolidation",
      "international expansion",
      "new product lines"
    ]
  },
  fintech_startup: {
    stages: ["Seed", "Series A", "Pre-Series B"],
    characteristics: [
      "regulatory approval in progress",
      "innovative business model",
      "strong technical team",
      "early user traction"
    ],
    metrics: ["Pre-revenue to $5M", "regulatory milestones pending", "high burn"],
    challenges: [
      "regulatory complexity",
      "trust building",
      "unit economics"
    ],
    opportunities: [
      "regulatory moat once approved",
      "bank partnership deals",
      "embedded finance"
    ]
  },
  fintech_scaleup: {
    stages: ["Series B", "Series C"],
    characteristics: [
      "fully licensed",
      "proven unit economics",
      "institutional partnerships",
      "multi-channel distribution"
    ],
    metrics: ["$20M-$100M revenue", "40-60% growth", "path to profitability"],
    challenges: [
      "compliance at scale",
      "fraud management",
      "customer acquisition costs"
    ],
    opportunities: [
      "new product lines",
      "B2B pivot",
      "international licenses"
    ]
  },
  ecommerce_startup: {
    stages: ["Seed", "Series A"],
    characteristics: [
      "differentiated product or model",
      "strong DTC brand",
      "viral marketing success",
      "high customer engagement"
    ],
    metrics: ["$1M-$10M GMV", "100%+ growth", "high marketing spend"],
    challenges: [
      "CAC efficiency",
      "supply chain",
      "inventory management"
    ],
    opportunities: [
      "category expansion",
      "wholesale channel",
      "international markets"
    ]
  },
  manufacturing_smb: {
    stages: ["Established", "Growth", "Mature"],
    characteristics: [
      "regional market position",
      "specialized capabilities",
      "long-term customer relationships",
      "family or founder-owned"
    ],
    metrics: ["$5M-$50M revenue", "5-12% growth", "stable margins"],
    challenges: [
      "labor costs",
      "automation investment",
      "supply chain disruption"
    ],
    opportunities: [
      "nearshoring trends",
      "automation",
      "vertical integration"
    ]
  },
  healthcare_startup: {
    stages: ["Seed", "Series A", "Clinical trials"],
    characteristics: [
      "innovative digital health solution",
      "early clinical evidence",
      "experienced healthcare team",
      "pilot programs with health systems"
    ],
    metrics: ["Pre-revenue to $5M", "clinical validation phase", "grant funding"],
    challenges: [
      "FDA/CE approval",
      "reimbursement",
      "hospital sales cycles"
    ],
    opportunities: [
      "value-based care",
      "remote patient monitoring",
      "AI diagnostics"
    ]
  },
  consulting_smb: {
    stages: ["Established", "Growth"],
    characteristics: [
      "specialized expertise",
      "strong partner relationships",
      "thought leadership",
      "referral-based growth"
    ],
    metrics: ["$2M-$20M revenue", "15-25% growth", "high margins"],
    challenges: [
      "talent retention",
      "utilization rates",
      "key person risk"
    ],
    opportunities: [
      "productization",
      "offshore delivery",
      "niche expansion"
    ]
  }
};

// Helper to get company category from anchor
export function getCompanyCategory(anchorKey: string): string {
  if (anchorKey.startsWith("saas_")) return "saas";
  if (anchorKey.startsWith("fintech_")) return "fintech";
  if (anchorKey.startsWith("ecommerce_")) return "ecommerce";
  if (anchorKey.startsWith("healthcare_")) return "healthcare";
  if (anchorKey.startsWith("manufacturing_")) return "manufacturing";
  if (anchorKey.startsWith("retail_")) return "retail";
  if (anchorKey.startsWith("consulting_")) return "consulting";
  return "saas"; // default
}

// Helper to get company names for an anchor
export function getCompanyNamesForAnchor(anchorKey: string): string[] {
  const category = getCompanyCategory(anchorKey);
  return companyNames[category] || companyNames.saas;
}

// Helper to get profile for an anchor
export function getProfileForAnchor(anchorKey: string): CompanyProfile | null {
  return companyProfiles[anchorKey] || null;
}

// Locations for company headquarters
export const companyLocations = [
  "San Francisco, CA",
  "New York, NY",
  "Austin, TX",
  "Boston, MA",
  "Seattle, WA",
  "London, UK",
  "Berlin, Germany",
  "Stockholm, Sweden",
  "Oslo, Norway",
  "Amsterdam, Netherlands",
  "Tel Aviv, Israel",
  "Singapore",
  "Sydney, Australia",
  "Toronto, Canada"
];

// Team size ranges by stage
export const teamSizeRanges: Record<string, { min: number; max: number }> = {
  seed: { min: 5, max: 15 },
  series_a: { min: 15, max: 50 },
  series_b: { min: 50, max: 150 },
  series_c: { min: 150, max: 400 },
  growth: { min: 400, max: 1500 },
  enterprise: { min: 500, max: 5000 }
};

// Funding round sizes by stage
export const fundingRanges: Record<string, { min: number; max: number }> = {
  seed: { min: 1, max: 5 },
  series_a: { min: 8, max: 25 },
  series_b: { min: 25, max: 75 },
  series_c: { min: 75, max: 200 },
  growth: { min: 150, max: 500 }
};
