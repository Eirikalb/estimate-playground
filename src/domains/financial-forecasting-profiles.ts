/**
 * Rich company profiles and detail generators for natural financial analysis generation
 */

// Company name components for generating fictional companies
export const companyNameComponents = {
  prefixes: [
    "Nova", "Apex", "Vertex", "Zenith", "Helix", "Quantum", "Stellar", "Flux",
    "Nimbus", "Prism", "Atlas", "Summit", "Vector", "Pulse", "Nexus", "Cipher"
  ],
  suffixes: {
    saas: ["Labs", "Systems", "Cloud", "Platform", "HQ", "Software", "Tech", "AI"],
    ecommerce: ["Commerce", "Shop", "Mart", "Direct", "Store", "Goods", "Market"],
    fintech: ["Pay", "Finance", "Capital", "Money", "Wallet", "Bank", "Financial"],
    manufacturing: ["Industries", "Manufacturing", "Works", "Production", "Corp"],
    retail: ["Retail", "Stores", "Outlets", "Group", "Holdings"],
    healthcare: ["Health", "Med", "Care", "Therapeutics", "Bio", "Life"],
    consulting: ["Consulting", "Advisory", "Partners", "Associates", "Strategy"]
  },
  locations: [
    "San Francisco", "New York", "Austin", "Boston", "Seattle", "London",
    "Berlin", "Amsterdam", "Singapore", "Sydney", "Toronto", "Oslo",
    "Stockholm", "Copenhagen", "Dublin", "Tel Aviv"
  ]
};

// Company profile contexts for each anchor type
export interface CompanyProfile {
  industries: string[];
  businessModels: string[];
  customerTypes: string[];
  characteristics: string[];
  fundingStages: string[];
  teamSizeRanges: string[];
}

export const companyProfiles: Record<string, CompanyProfile> = {
  saas_startup_growth: {
    industries: ["B2B SaaS", "Enterprise Software", "Developer Tools", "MarTech", "HRTech"],
    businessModels: ["subscription-based SaaS", "usage-based pricing", "freemium to enterprise"],
    customerTypes: ["SMB customers", "early enterprise pilots", "developer community"],
    characteristics: [
      "product-market fit achieved",
      "strong founder-led sales",
      "high velocity inbound leads",
      "rapid iteration cycles"
    ],
    fundingStages: ["Seed", "Series A"],
    teamSizeRanges: ["10-50 employees"]
  },
  saas_scaleup_growth: {
    industries: ["Enterprise SaaS", "Vertical SaaS", "Infrastructure Software", "Security"],
    businessModels: ["enterprise subscription", "platform licensing", "consumption-based"],
    customerTypes: ["mid-market companies", "Fortune 1000 enterprises", "global organizations"],
    characteristics: [
      "proven go-to-market motion",
      "established sales organization",
      "expanding product suite",
      "international presence"
    ],
    fundingStages: ["Series B", "Series C", "Series D"],
    teamSizeRanges: ["100-500 employees"]
  },
  saas_enterprise_growth: {
    industries: ["Enterprise Software", "Cloud Infrastructure", "Business Applications"],
    businessModels: ["enterprise licensing", "multi-product platform", "strategic partnerships"],
    customerTypes: ["Fortune 500 companies", "government agencies", "large enterprises"],
    characteristics: [
      "market leader in category",
      "mature sales organization",
      "extensive partner ecosystem",
      "predictable revenue"
    ],
    fundingStages: ["Late Stage", "Pre-IPO", "Public"],
    teamSizeRanges: ["1000+ employees"]
  },
  ecommerce_startup: {
    industries: ["D2C Brands", "Marketplace", "Social Commerce", "Luxury Goods"],
    businessModels: ["direct-to-consumer", "marketplace commission", "subscription boxes"],
    customerTypes: ["millennials and Gen-Z", "niche enthusiasts", "value seekers"],
    characteristics: [
      "strong social media presence",
      "viral growth potential",
      "efficient customer acquisition",
      "unique product differentiation"
    ],
    fundingStages: ["Seed", "Series A"],
    teamSizeRanges: ["5-30 employees"]
  },
  ecommerce_scaleup: {
    industries: ["Retail E-commerce", "Fashion", "Home Goods", "Electronics"],
    businessModels: ["omnichannel retail", "private label + marketplace", "subscription services"],
    customerTypes: ["broad consumer base", "repeat purchasers", "brand loyalists"],
    characteristics: [
      "established brand recognition",
      "optimized supply chain",
      "multi-channel distribution",
      "data-driven merchandising"
    ],
    fundingStages: ["Series B", "Series C"],
    teamSizeRanges: ["100-300 employees"]
  },
  ecommerce_enterprise: {
    industries: ["Retail", "Consumer Goods", "Global E-commerce"],
    businessModels: ["multi-brand portfolio", "global marketplace", "retail media"],
    customerTypes: ["mass market consumers", "international customers", "B2B wholesale"],
    characteristics: [
      "household brand name",
      "sophisticated logistics network",
      "proprietary technology platform",
      "public market presence"
    ],
    fundingStages: ["Public", "Private Equity"],
    teamSizeRanges: ["1000+ employees"]
  },
  fintech_startup: {
    industries: ["Payments", "Lending", "Neobanking", "InsurTech", "WealthTech"],
    businessModels: ["transaction fees", "lending spreads", "subscription banking"],
    customerTypes: ["underbanked consumers", "SMBs", "gig workers", "digital natives"],
    characteristics: [
      "regulatory navigation in progress",
      "innovative user experience",
      "partnership with traditional FIs",
      "strong compliance foundation"
    ],
    fundingStages: ["Seed", "Series A"],
    teamSizeRanges: ["20-80 employees"]
  },
  fintech_scaleup: {
    industries: ["Digital Banking", "B2B Payments", "Embedded Finance", "Crypto/Web3"],
    businessModels: ["banking-as-a-service", "payment infrastructure", "platform fees"],
    customerTypes: ["banks and FIs", "large merchants", "platform companies"],
    characteristics: [
      "full regulatory licenses obtained",
      "significant transaction volume",
      "enterprise-grade infrastructure",
      "international expansion"
    ],
    fundingStages: ["Series B", "Series C", "Series D"],
    teamSizeRanges: ["200-800 employees"]
  },
  fintech_enterprise: {
    industries: ["Core Banking", "Payment Networks", "Financial Infrastructure"],
    businessModels: ["infrastructure licensing", "transaction processing", "data services"],
    customerTypes: ["global banks", "payment networks", "governments"],
    characteristics: [
      "critical financial infrastructure",
      "regulatory relationships globally",
      "mission-critical reliability",
      "decades of operating history"
    ],
    fundingStages: ["Public", "Late Private"],
    teamSizeRanges: ["2000+ employees"]
  },
  manufacturing_smb: {
    industries: ["Industrial Equipment", "Components", "Consumer Products", "Specialty Manufacturing"],
    businessModels: ["B2B contract manufacturing", "OEM partnerships", "direct sales"],
    customerTypes: ["industrial buyers", "distributors", "specialty retailers"],
    characteristics: [
      "established customer relationships",
      "efficient production processes",
      "quality certifications",
      "regional market focus"
    ],
    fundingStages: ["Bootstrapped", "Private Equity"],
    teamSizeRanges: ["50-200 employees"]
  },
  manufacturing_enterprise: {
    industries: ["Industrial Manufacturing", "Aerospace", "Automotive", "Heavy Industry"],
    businessModels: ["long-term contracts", "global supply chains", "aftermarket services"],
    customerTypes: ["global OEMs", "government contractors", "multinational corporations"],
    characteristics: [
      "global manufacturing footprint",
      "complex supply chain management",
      "significant R&D investment",
      "regulatory certifications"
    ],
    fundingStages: ["Public", "Corporate"],
    teamSizeRanges: ["5000+ employees"]
  },
  retail_smb: {
    industries: ["Specialty Retail", "Convenience", "Food Service", "Personal Services"],
    businessModels: ["brick-and-mortar stores", "franchise model", "local e-commerce"],
    customerTypes: ["local community", "regular customers", "walk-in traffic"],
    characteristics: [
      "strong local brand",
      "customer service focus",
      "community relationships",
      "multi-location presence"
    ],
    fundingStages: ["Bootstrapped", "Bank Financing"],
    teamSizeRanges: ["20-100 employees"]
  },
  retail_enterprise: {
    industries: ["Big Box Retail", "Grocery", "Apparel Chains", "Department Stores"],
    businessModels: ["national chain", "omnichannel retail", "private label"],
    customerTypes: ["mass market consumers", "families", "value shoppers"],
    characteristics: [
      "national brand recognition",
      "sophisticated supply chain",
      "real estate portfolio",
      "loyalty programs"
    ],
    fundingStages: ["Public", "Private Equity"],
    teamSizeRanges: ["10000+ employees"]
  },
  healthcare_startup: {
    industries: ["Digital Health", "Telemedicine", "Mental Health", "Remote Monitoring"],
    businessModels: ["B2B2C", "employer health", "health plan partnerships"],
    customerTypes: ["self-insured employers", "health plans", "consumers"],
    characteristics: [
      "clinical validation studies",
      "health system partnerships",
      "regulatory pathway defined",
      "early outcomes data"
    ],
    fundingStages: ["Seed", "Series A", "Series B"],
    teamSizeRanges: ["30-150 employees"]
  },
  healthcare_scaleup: {
    industries: ["HealthTech", "Medical Devices", "Diagnostics", "Care Delivery"],
    businessModels: ["device sales", "subscription services", "platform licensing"],
    customerTypes: ["hospital systems", "physician practices", "payers"],
    characteristics: [
      "FDA clearance obtained",
      "growing commercial traction",
      "established reimbursement",
      "clinical evidence base"
    ],
    fundingStages: ["Series C", "Series D"],
    teamSizeRanges: ["200-600 employees"]
  },
  consulting_smb: {
    industries: ["Management Consulting", "IT Services", "Strategy", "Operations"],
    businessModels: ["time and materials", "project-based", "retainer relationships"],
    customerTypes: ["mid-market companies", "private equity portfolio", "regional enterprises"],
    characteristics: [
      "senior partner relationships",
      "specialized expertise",
      "strong utilization rates",
      "repeat client base"
    ],
    fundingStages: ["Partnership", "Private"],
    teamSizeRanges: ["20-100 professionals"]
  },
  consulting_enterprise: {
    industries: ["Global Consulting", "Big 4", "Systems Integration", "Strategy"],
    businessModels: ["multi-service platform", "managed services", "transformation programs"],
    customerTypes: ["Fortune 500", "governments", "global institutions"],
    characteristics: [
      "global delivery network",
      "brand equity",
      "thought leadership",
      "diversified service lines"
    ],
    fundingStages: ["Partnership", "Public"],
    teamSizeRanges: ["50000+ employees"]
  }
};

// Financial metrics ranges for narrative generation
export interface MetricRanges {
  revenueRanges: { min: number; max: number; unit: string }[];
  customerCounts: string[];
  avgContractValues: string[];
  growthDescriptors: string[];
}

export const metricRanges: Record<string, MetricRanges> = {
  saas_startup_growth: {
    revenueRanges: [
      { min: 0.5, max: 2, unit: "M ARR" },
      { min: 2, max: 5, unit: "M ARR" }
    ],
    customerCounts: ["50-200 paying customers", "100-500 accounts"],
    avgContractValues: ["$5K-15K ACV", "$10K-30K ACV"],
    growthDescriptors: ["hypergrowth", "rapid scaling", "explosive growth trajectory"]
  },
  saas_scaleup_growth: {
    revenueRanges: [
      { min: 10, max: 30, unit: "M ARR" },
      { min: 30, max: 50, unit: "M ARR" }
    ],
    customerCounts: ["500-2000 customers", "1000+ enterprise accounts"],
    avgContractValues: ["$25K-75K ACV", "$50K-150K ACV"],
    growthDescriptors: ["strong growth", "scaling efficiently", "market expansion"]
  },
  saas_enterprise_growth: {
    revenueRanges: [
      { min: 50, max: 150, unit: "M ARR" },
      { min: 150, max: 500, unit: "M ARR" }
    ],
    customerCounts: ["2000+ enterprise customers", "5000+ total accounts"],
    avgContractValues: ["$100K-500K ACV", "$250K+ ACV"],
    growthDescriptors: ["steady growth", "mature expansion", "consistent scaling"]
  },
  fintech_startup: {
    revenueRanges: [
      { min: 1, max: 5, unit: "M revenue" },
      { min: 5, max: 20, unit: "M revenue" }
    ],
    customerCounts: ["10K-100K users", "50K-500K accounts"],
    avgContractValues: ["$5-20 ARPU/month", "$50-200 annual revenue per user"],
    growthDescriptors: ["rapid user acquisition", "viral growth", "network effects building"]
  },
  ecommerce_startup: {
    revenueRanges: [
      { min: 1, max: 5, unit: "M GMV" },
      { min: 5, max: 20, unit: "M GMV" }
    ],
    customerCounts: ["5K-50K customers", "20K-100K orders annually"],
    avgContractValues: ["$50-100 AOV", "$75-150 AOV"],
    growthDescriptors: ["viral growth", "category disruption", "rapid brand building"]
  }
};

// Team and leadership descriptors
export const leadershipProfiles = [
  "seasoned executive team with prior exits",
  "domain experts with deep industry experience",
  "second-time founders with strong track record",
  "experienced operators from leading companies",
  "former executives from industry leaders",
  "technical founders with enterprise experience"
];

// Product and technology descriptors
export const productDescriptors = [
  "proprietary AI/ML capabilities",
  "modern cloud-native architecture",
  "next-generation platform technology",
  "differentiated data assets",
  "patent-protected innovations",
  "unique integration capabilities"
];

// Market position descriptors
export const marketPositionDescriptors = [
  "emerging category leader",
  "fast follower with differentiation",
  "niche market specialist",
  "platform player with ecosystem",
  "disruptive new entrant",
  "established market leader"
];

// Helper to get anchor category
export function getAnchorCategory(anchorKey: string): string {
  if (anchorKey.startsWith("saas_")) return "saas";
  if (anchorKey.startsWith("ecommerce_")) return "ecommerce";
  if (anchorKey.startsWith("fintech_")) return "fintech";
  if (anchorKey.startsWith("manufacturing_")) return "manufacturing";
  if (anchorKey.startsWith("retail_")) return "retail";
  if (anchorKey.startsWith("healthcare_")) return "healthcare";
  if (anchorKey.startsWith("consulting_")) return "consulting";
  return "saas";
}

// Helper to get company name suffix based on category
export function getNameSuffixForAnchor(anchorKey: string): string[] {
  const category = getAnchorCategory(anchorKey);
  return companyNameComponents.suffixes[category as keyof typeof companyNameComponents.suffixes] 
    || companyNameComponents.suffixes.saas;
}
